import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

const shell =
  "flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-12 text-center sm:py-16";

export const LoadingState = ({ label = "Loading…" }) => (
  <div className={shell} role="status" aria-live="polite">
    <Loader2 size={22} className="animate-spin text-cyan-300" />

    <p className="mt-3 text-sm text-gray-500">{label}</p>
  </div>
);

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className={shell}>
    {Icon ? (
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-500">
        <Icon size={20} />
      </div>
    ) : null}

    <h3 className="mt-4 text-sm font-semibold text-gray-200 sm:text-base">
      {title}
    </h3>

    {description ? (
      <p className="mt-1.5 max-w-md text-xs leading-6 text-gray-500 sm:text-sm">
        {description}
      </p>
    ) : null}

    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div className={shell} role="alert">
    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/[0.07] text-red-300">
      <AlertTriangle size={20} />
    </div>

    <h3 className="mt-4 text-sm font-semibold text-gray-200 sm:text-base">
      Something went wrong
    </h3>

    <p className="mt-1.5 max-w-md text-xs leading-6 text-gray-500 sm:text-sm">
      {message}
    </p>

    {onRetry ? (
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-xs text-gray-300 transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 sm:text-sm"
      >
        <RefreshCw size={14} />
        Try again
      </button>
    ) : null}
  </div>
);
