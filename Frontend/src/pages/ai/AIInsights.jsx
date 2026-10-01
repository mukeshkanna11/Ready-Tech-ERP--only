import { useState } from "react";
import {
  Boxes,
  FolderKanban,
  GitBranch,
  Lightbulb,
  ListTodo,
  Package,
  RefreshCw,
  ShoppingCart,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Button,
  CountBars,
  EmptyState,
  ErrorState,
  Loading,
  MonthlyBars,
  PageHeader,
  Panel,
  StatCard,
} from "./aiShared";
import {
  formatCurrency,
  formatNumber,
  monthlySeries,
  toCounts,
  useApi,
} from "./aiUtils";

const inputClass =
  "h-9 rounded-lg border border-white/10 bg-[#070a11] px-3 text-sm text-white outline-none focus:border-cyan-400/30";

const AIInsights = () => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const query = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString();

  const overview = useApi(`/reports/overview?${query}`);
  const sales = useApi(`/reports/sales?${query}`);

  const data = overview.data || {};
  const master = data.masterData || {};
  const series = monthlySeries(sales.data?.monthly);
  const projectCounts = Object.entries(data.projects || {}).map(([label, value]) => ({
    label: label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    count: Number(value?.count) || 0,
  }));
  const taskCounts = toCounts(data.tasks);
  const workflowCounts = toCounts(data.workflows);

  const summaryLines = overview.data
    ? [
        `${formatNumber(master.customers)} customers, ${formatNumber(master.vendors)} vendors and ${formatNumber(master.products)} products are on record.`,
        `${formatNumber(data.purchases?.count)} purchase orders worth ${formatCurrency(data.purchases?.total)} in this period.`,
        sales.data
          ? `${formatNumber(sales.data.count)} sales worth ${formatCurrency(sales.data.total)} in this period.`
          : null,
        `${formatNumber(master.projects)} projects and ${formatNumber(master.tasks)} tasks are being tracked.`,
      ].filter(Boolean)
    : [];

  const refresh = () => {
    overview.reload();
    sales.reload();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Lightbulb}
        title="AI Business Insights"
        description="KPIs and trends from your existing ERP reports."
        actions={
          <>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} aria-label="From date" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} aria-label="To date" />
            <Button onClick={refresh} disabled={overview.loading}>
              <RefreshCw size={14} className={overview.loading ? "animate-spin" : ""} />
              Refresh
            </Button>
          </>
        }
      />

      {overview.loading ? (
        <Loading rows={4} />
      ) : overview.error ? (
        <ErrorState message={overview.error} onRetry={refresh} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard icon={Users} label="Customers" value={formatNumber(master.customers)} />
            <StatCard icon={Store} label="Vendors" value={formatNumber(master.vendors)} />
            <StatCard icon={Package} label="Products" value={formatNumber(master.products)} />
            <StatCard icon={Boxes} label="Inventory records" value={formatNumber(master.inventory)} />
            <StatCard
              icon={ShoppingCart}
              label="Purchases"
              value={formatCurrency(data.purchases?.total)}
              hint={`${formatNumber(data.purchases?.count)} orders`}
            />
            <StatCard
              icon={TrendingUp}
              label="Sales"
              value={sales.data ? formatCurrency(sales.data.total) : "—"}
              hint={sales.data ? `${formatNumber(sales.data.count)} sales` : sales.error || "Loading…"}
              tone="text-emerald-300"
            />
            <StatCard icon={FolderKanban} label="Projects" value={formatNumber(master.projects)} />
            <StatCard icon={GitBranch} label="Workflow instances" value={formatNumber(data.workflowInstances)} />
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <Panel title="Business summary" icon={Lightbulb}>
              <ul className="space-y-2.5 text-sm text-gray-300">
                {summaryLines.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11px] text-gray-600">Generated from ERP report figures, not by an AI model.</p>
            </Panel>

            <Panel title="Sales trend (monthly)" icon={TrendingUp} className="xl:col-span-2">
              {sales.loading ? (
                <Loading rows={3} />
              ) : sales.error ? (
                <ErrorState message={sales.error} onRetry={sales.reload} />
              ) : series.length ? (
                <MonthlyBars series={series} />
              ) : (
                <EmptyState icon={TrendingUp} title="No sales in this period" />
              )}
            </Panel>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              { title: "Projects by status", icon: FolderKanban, items: projectCounts },
              { title: "Tasks by status", icon: ListTodo, items: taskCounts },
              { title: "Workflows by status", icon: GitBranch, items: workflowCounts },
            ].map(({ title, icon, items }) => (
              <Panel key={title} title={title} icon={icon}>
                {items.length ? <CountBars items={items} /> : <EmptyState icon={icon} title="No records" />}
              </Panel>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AIInsights;
