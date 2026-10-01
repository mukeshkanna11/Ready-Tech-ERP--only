import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  GitBranch,
  ListChecks,
  RefreshCw,
  XCircle,
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
  humanize,
  useApi,
} from "./aiUtils";

const DAY = 24 * 60 * 60 * 1000;

const AIWorkflow = () => {
  const summary = useApi("/workflows/summary");
  const pending = useApi("/workflows/instances/pending");

  const workflows = summary.data?.workflows || {};
  const instances = summary.data?.instances || {};
  const pendingList = Array.isArray(pending.data) ? pending.data : [];

  const [now] = useState(() => Date.now());
  const stale = pendingList.filter(
    (item) => item.startedAt && now - new Date(item.startedAt).getTime() > 3 * DAY
  );

  const suggestions = [];
  if (pendingList.length) {
    suggestions.push({
      text: `Review ${formatNumber(pendingList.length)} approval${pendingList.length === 1 ? "" : "s"} assigned to you`,
      to: "/workflow/instances",
    });
  }
  if (stale.length) {
    suggestions.push({
      text: `${formatNumber(stale.length)} pending request${stale.length === 1 ? " has" : "s have"} waited more than 3 days`,
      to: "/workflow/instances",
    });
  }
  if (Number(workflows.draft)) {
    suggestions.push({
      text: `Activate or finish ${formatNumber(workflows.draft)} draft workflow${Number(workflows.draft) === 1 ? "" : "s"}`,
      to: "/workflow",
    });
  }
  if (summary.data && !Number(workflows.active)) {
    suggestions.push({ text: "No active workflows — set one up to route approvals", to: "/workflow" });
  }

  const loading = summary.loading || pending.loading;
  const refresh = () => {
    summary.reload();
    pending.reload();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={GitBranch}
        title="AI Workflow Assistance"
        description="Your pending approvals and suggested next steps from workflow data."
        actions={
          <Button onClick={refresh} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        }
      />

      {summary.error ? (
        <ErrorState message={summary.error} onRetry={refresh} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={GitBranch}
            label="Active workflows"
            value={summary.loading ? "…" : formatNumber(workflows.active)}
            hint={summary.loading ? "" : `${formatNumber(workflows.total)} total · ${formatNumber(workflows.draft)} draft`}
          />
          <StatCard
            icon={Clock}
            label="Pending"
            value={summary.loading ? "…" : formatNumber(instances.pending)}
            tone="text-amber-300"
          />
          <StatCard
            icon={CheckCircle2}
            label="Approved"
            value={summary.loading ? "…" : formatNumber(instances.approved)}
            tone="text-emerald-300"
          />
          <StatCard
            icon={XCircle}
            label="Rejected / cancelled"
            value={
              summary.loading
                ? "…"
                : formatNumber((Number(instances.rejected) || 0) + (Number(instances.cancelled) || 0))
            }
            tone="text-rose-300"
          />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Suggested actions" icon={ListChecks}>
          {loading ? (
            <Loading />
          ) : suggestions.length ? (
            <ul className="space-y-2">
              {suggestions.map((item) => (
                <li key={item.text}>
                  <Link
                    to={item.to}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-gray-200 transition hover:border-cyan-400/20 hover:text-white"
                  >
                    {item.text}
                    <ArrowUpRight size={14} className="shrink-0 text-gray-500" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={CheckCircle2} title="You're all caught up" description="No workflow actions need your attention." />
          )}
        </Panel>

        <Panel
          title="Pending approvals"
          icon={Clock}
          className="xl:col-span-2"
          action={
            <Link to="/workflow/instances" className="text-xs text-cyan-300 hover:text-cyan-200">
              Open workflow instances
            </Link>
          }
        >
          {pending.loading ? (
            <Loading rows={4} />
          ) : pending.error ? (
            <ErrorState message={pending.error} onRetry={pending.reload} />
          ) : pendingList.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-[10px] uppercase tracking-[0.1em] text-gray-500">
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-2 py-2">Request</th>
                    <th className="px-2 py-2">Workflow</th>
                    <th className="px-2 py-2">Current step</th>
                    <th className="px-2 py-2">Requested by</th>
                    <th className="px-2 py-2">Started</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {pendingList.map((item) => (
                    <tr key={item._id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-2 py-2.5">
                        <p className="text-gray-100">{item.entityNumber || item.workflowNumber || "—"}</p>
                        <p className="text-[11px] text-gray-500">{humanize(item.entityType)}</p>
                      </td>
                      <td className="px-2 py-2.5 text-gray-300">
                        {item.workflowId?.name || item.workflowNumber || "—"}
                      </td>
                      <td className="px-2 py-2.5 text-gray-300">
                        {item.currentStep?.stepName || item.currentStep?.name || `Step ${item.currentStepNumber ?? "—"}`}
                      </td>
                      <td className="px-2 py-2.5 text-gray-400">{item.requestedBy?.name || "—"}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-gray-500">{formatDate(item.startedAt || item.createdAt)}</td>
                      <td className="px-2 py-2.5 text-right">
                        <Link
                          to={`/workflow/instances/${item._id}`}
                          className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200"
                        >
                          Open <ArrowUpRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Clock} title="No pending approvals" description="Requests waiting on you will appear here." />
          )}
        </Panel>
      </div>
    </div>
  );
};

export default AIWorkflow;
