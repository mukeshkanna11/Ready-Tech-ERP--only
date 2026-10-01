import { AlertCircle, Loader2, PlugZap, RefreshCw } from "lucide-react";
import { formatCurrency, formatNumber } from "./aiUtils";

export const PageHeader = ({ icon: Icon, title, description, actions }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300">
        <Icon size={20} strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400">
          AI Content
        </p>
        <h1 className="mt-0.5 text-xl font-semibold text-white sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export const Panel = ({ title, icon: Icon, action, children, className = "" }) => (
  <section
    className={`rounded-2xl border border-white/[0.07] bg-[#0b0f17] p-4 sm:p-5 ${className}`}
  >
    {(title || action) && (
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-200">
          {Icon && <Icon size={15} className="text-gray-500" />}
          {title}
        </h2>
        {action}
      </div>
    )}
    {children}
  </section>
);

export const StatCard = ({ icon: Icon, label, value, hint, tone = "text-cyan-300" }) => (
  <div className="rounded-xl border border-white/[0.07] bg-[#0b0f17] p-4">
    <div className="flex items-center justify-between">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
        {label}
      </p>
      {Icon && <Icon size={15} className={tone} />}
    </div>
    <p className="mt-2 truncate text-xl font-semibold text-white">{value}</p>
    {hint && <p className="mt-0.5 text-[11px] text-gray-600">{hint}</p>}
  </div>
);

export const Button = ({ variant = "secondary", className = "", children, ...props }) => (
  <button
    type="button"
    className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
      variant === "primary"
        ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
        : "border border-white/10 bg-white/[0.03] text-gray-200 hover:bg-white/[0.07]"
    } ${className}`}
    {...props}
  >
    {children}
  </button>
);

export const Loading = ({ rows = 3 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="h-10 animate-pulse rounded-lg bg-white/[0.03]" />
    ))}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-500/15 bg-rose-500/[0.05] px-4 py-8 text-center">
    <AlertCircle size={22} className="text-rose-400" />
    <p className="text-sm text-rose-300">{message}</p>
    {onRetry && (
      <Button onClick={onRetry}>
        <RefreshCw size={14} />
        Retry
      </Button>
    )}
  </div>
);

export const EmptyState = ({ icon: Icon, title, description, children }) => (
  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/[0.08] px-4 py-10 text-center">
    {Icon && <Icon size={24} className="text-gray-600" />}
    <p className="text-sm font-medium text-gray-300">{title}</p>
    {description && <p className="max-w-md text-xs text-gray-600">{description}</p>}
    {children}
  </div>
);

export const NotConnected = ({ feature }) => (
  <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
    <PlugZap size={16} className="mt-0.5 shrink-0 text-amber-300" />
    <div>
      <p className="text-sm font-medium text-amber-200">AI service not connected</p>
      <p className="mt-0.5 text-xs text-amber-200/70">
        {feature} needs an AI backend endpoint, which this ERP does not provide yet. No AI
        output is generated or simulated.
      </p>
    </div>
  </div>
);

export const Spinner = () => <Loader2 size={14} className="animate-spin" />;

export const CountBars = ({ items }) => {
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-gray-400">{item.label}</span>
            <span className="font-medium tabular-nums text-gray-200">
              {formatNumber(item.count)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.05]">
            <div
              className="h-1.5 rounded-full bg-cyan-400/70"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};

export const MonthlyBars = ({ series }) => {
  const max = Math.max(...series.map((item) => item.total), 1);
  return (
    <div className="flex h-48 items-end gap-2 overflow-x-auto pb-1">
      {series.map((item) => (
        <div key={item.label} className="flex min-w-[42px] flex-1 flex-col items-center gap-1.5">
          <span className="text-[10px] tabular-nums text-gray-500">{formatCurrency(item.total)}</span>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-cyan-400/60"
              style={{ height: `${Math.max((item.total / max) * 100, 2)}%` }}
              title={`${item.label}: ${formatCurrency(item.total)}`}
            />
          </div>
          <span className="text-[10px] text-gray-500">{item.label}</span>
        </div>
      ))}
    </div>
  );
};
