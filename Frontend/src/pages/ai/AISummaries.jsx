import { useState } from "react";
import { Check, ClipboardCopy, Download, FileText, ListChecks, Play, Sparkles } from "lucide-react";
import api from "../../services/api";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  Button,
  EmptyState,
  ErrorState,
  Loading,
  NotConnected,
  PageHeader,
  Panel,
  Spinner,
} from "./aiShared";
import {
  flattenReport,
  logActivity,
} from "./aiUtils";

const SOURCES = [
  { key: "overview", label: "Business overview" },
  { key: "sales", label: "Sales" },
  { key: "purchases", label: "Purchases" },
  { key: "invoices", label: "Invoices" },
  { key: "payments", label: "Payments" },
  { key: "expenses", label: "Expenses" },
  { key: "inventory", label: "Inventory" },
  { key: "customers", label: "Customers" },
  { key: "vendors", label: "Vendors" },
  { key: "projects", label: "Projects" },
  { key: "tasks", label: "Tasks" },
  { key: "workflows", label: "Workflows" },
];

const inputClass =
  "h-10 w-full rounded-lg border border-white/10 bg-[#070a11] px-3 text-sm text-white outline-none focus:border-cyan-400/30";

const AISummaries = () => {
  const [source, setSource] = useState("overview");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const sourceLabel = SOURCES.find((item) => item.key === source)?.label;

  const summarize = async (event) => {
    event?.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const response = await api.get(`/reports/${source}?${params.toString()}`);
      const points = flattenReport(response?.data?.data || {});
      setResult({ source: sourceLabel, from, to, points });
      logActivity("Data summary", `${sourceLabel} (${points.length} key points)`);
    } catch (err) {
      setResult(null);
      setError(getApiErrorMessage(err, "Unable to load report data."));
    } finally {
      setLoading(false);
    }
  };

  const asText = () =>
    result
      ? [`${result.source} summary${result.from || result.to ? ` (${result.from || "…"} to ${result.to || "…"})` : ""}`]
          .concat(result.points.map((point) => `• ${point.label}: ${point.value}`))
          .join("\n")
      : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(asText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Clipboard is not available in this browser.");
    }
  };

  const exportCsv = () => {
    const csv = ["Metric,Value"]
      .concat(
        result.points.map(
          (point) => `"${point.label.replace(/"/g, '""')}","${String(point.value).replace(/"/g, '""')}"`
        )
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${source}-summary.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={FileText}
        title="AI Document & Data Summaries"
        description="Summarize ERP report data into key points you can copy or export."
      />

      <Panel title="Select data" icon={ListChecks}>
        <form onSubmit={summarize} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_170px_170px_auto]">
          <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass} aria-label="Data source">
            {SOURCES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} aria-label="From date" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} aria-label="To date" />
          <Button type="submit" variant="primary" disabled={loading} className="h-10">
            {loading ? <Spinner /> : <Play size={14} />}
            Summarize
          </Button>
        </form>
        <p className="mt-3 text-xs text-gray-600">
          Document upload is not available in this ERP yet, so summaries use existing report data.
        </p>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title={result ? `Key points · ${result.source}` : "Key points"}
          icon={ListChecks}
          action={
            result?.points.length ? (
              <div className="flex gap-2">
                <Button onClick={copy}>
                  {copied ? <Check size={14} /> : <ClipboardCopy size={14} />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button onClick={exportCsv}>
                  <Download size={14} />
                  CSV
                </Button>
              </div>
            ) : null
          }
        >
          {loading ? (
            <Loading rows={5} />
          ) : error ? (
            <ErrorState message={error} onRetry={summarize} />
          ) : !result ? (
            <EmptyState icon={FileText} title="No summary yet" description="Choose a data source and click Summarize." />
          ) : result.points.length ? (
            <ul className="max-h-[480px] divide-y divide-white/[0.05] overflow-y-auto">
              {result.points.map((point) => (
                <li key={point.label} className="flex items-start justify-between gap-4 py-2 text-sm">
                  <span className="text-gray-400">{point.label}</span>
                  <span className="shrink-0 font-medium tabular-nums text-gray-100">{point.value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={FileText} title="No data for this selection" description="Try another source or date range." />
          )}
        </Panel>

        <Panel title="AI narrative summary" icon={Sparkles}>
          <NotConnected feature="Narrative AI summarization" />
        </Panel>
      </div>
    </div>
  );
};

export default AISummaries;
