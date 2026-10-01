import { useState } from "react";
import { BarChart3, History, Sparkles, TrendingUp } from "lucide-react";
import api from "../../services/api";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  Button,
  EmptyState,
  ErrorState,
  Loading,
  MonthlyBars,
  PageHeader,
  Panel,
  Spinner,
} from "./aiShared";
import {
  formatCurrency,
  logActivity,
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
  const [from, setFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 12, 1);
    return date.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState("");
  const [result, setResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [forecastError, setForecastError] = useState("");

  const resetFor = (setter) => (event) => {
    setter(event.target.value);
    setResult(null);
    setForecastError("");
  };

  const generate = async () => {
    if (generating) return;
    try {
      setGenerating(true);
      setForecastError("");
      const response = await api.post("/ai/forecast", { source, horizon, from, to });
      setResult(response.data.data);
      logActivity("Forecast", `${label} · ${horizon}`);
    } catch (err) {
      setResult(null);
      setForecastError(getApiErrorMessage(err, "Unable to generate forecast."));
    } finally {
      setGenerating(false);
    }
  };

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
          <select value={source} onChange={resetFor(setSource)} className={inputClass} aria-label="Metric">
            {SOURCES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
          <select value={horizon} onChange={resetFor(setHorizon)} className={inputClass} aria-label="Forecast horizon">
            {HORIZONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <input type="date" value={from} onChange={resetFor(setFrom)} className={inputClass} aria-label="History from" />
          <input type="date" value={to} onChange={resetFor(setTo)} className={inputClass} aria-label="History to" />
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="primary" onClick={generate} disabled={generating || history.loading || series.length < 3}>
            {generating ? <Spinner /> : <Sparkles size={14} />}
            Generate forecast
          </Button>
        </div>
        {!history.loading && !history.error && series.length < 3 && (
          <p className="mt-2 text-right text-xs text-gray-600">
            At least 3 months of history are needed to forecast.
          </p>
        )}
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
          {generating ? (
            <Loading rows={4} />
          ) : forecastError ? (
            <ErrorState message={forecastError} onRetry={generate} />
          ) : result ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 font-medium text-cyan-300">
                  Confidence: {result.confidence}
                </span>
                <span className="text-gray-500">{result.method}</span>
              </div>
              <p className="text-sm text-gray-300">{result.summary}</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="text-[10px] uppercase tracking-[0.1em] text-gray-500">
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-2 py-2">Period</th>
                      <th className="px-2 py-2 text-right">Forecast</th>
                      <th className="px-2 py-2 text-right">Low</th>
                      <th className="px-2 py-2 text-right">High</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(result.forecast || []).map((row) => (
                      <tr key={row.period} className="border-b border-white/[0.04]">
                        <td className="px-2 py-2 text-gray-300">{row.period}</td>
                        <td className="px-2 py-2 text-right font-medium tabular-nums text-white">{formatCurrency(row.value)}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-gray-400">{formatCurrency(row.low)}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-gray-400">{formatCurrency(row.high)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-gray-600">
                AI-generated from {result.history?.length || 0} months of your {result.source} history. Estimates, not guarantees.
              </p>
            </div>
          ) : (
            <EmptyState
              icon={TrendingUp}
              title="No forecast yet"
              description="Choose a metric and horizon, then click Generate forecast."
            />
          )}
        </Panel>
      </div>
    </div>
  );
};

export default AIForecasts;
