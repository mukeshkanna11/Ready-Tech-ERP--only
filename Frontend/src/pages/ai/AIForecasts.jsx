import { useState } from "react";
import { BarChart3, History, TrendingUp } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  Loading,
  MonthlyBars,
  NotConnected,
  PageHeader,
  Panel,
} from "./aiShared";
import {
  monthlySeries,
  useApi,
} from "./aiUtils";

const SOURCES = [
  { key: "sales", label: "Sales revenue" },
  { key: "purchases", label: "Purchase spend" },
];

const HORIZONS = ["Next 1 month", "Next 3 months", "Next 6 months", "Next 12 months"];

const inputClass =
  "h-10 w-full rounded-lg border border-white/10 bg-[#070a11] px-3 text-sm text-white outline-none focus:border-cyan-400/30 disabled:opacity-50";

const AIForecasts = () => {
  const [source, setSource] = useState("sales");
  const [horizon, setHorizon] = useState(HORIZONS[1]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const query = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString();
  const history = useApi(`/reports/${source}?${query}`);
  const series = monthlySeries(history.data?.monthly);
  const label = SOURCES.find((item) => item.key === source)?.label;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={TrendingUp}
        title="AI Forecasting"
        description="Forecast dashboard built on your historical ERP data."
      />

      <Panel title="Forecast filters" icon={BarChart3}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass} aria-label="Metric">
            {SOURCES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
          <select value={horizon} onChange={(e) => setHorizon(e.target.value)} className={inputClass} aria-label="Forecast horizon">
            {HORIZONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} aria-label="History from" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} aria-label="History to" />
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title={`Historical ${label?.toLowerCase()} (actuals)`} icon={History}>
          {history.loading ? (
            <Loading rows={3} />
          ) : history.error ? (
            <ErrorState message={history.error} onRetry={history.reload} />
          ) : series.length ? (
            <MonthlyBars series={series} />
          ) : (
            <EmptyState
              icon={History}
              title="No monthly history available"
              description="This report returned no monthly data for the selected period."
            />
          )}
        </Panel>

        <Panel title={`Forecast · ${horizon}`} icon={TrendingUp}>
          <NotConnected feature="AI forecasting" />
          <EmptyState
            icon={TrendingUp}
            title="No forecast available"
            description="Predictions will appear here once a forecasting service is connected. Historical actuals are shown alongside for reference."
          />
        </Panel>
      </div>
    </div>
  );
};

export default AIForecasts;
