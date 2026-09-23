import { AlertTriangle, Loader2 } from "lucide-react";
import Modal from "../ui/Modal";

/** Destructive-action confirmation built on the shared Modal shell. */
const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  loading = false,
  error = "",
  onConfirm,
  onClose,
}) => (
  <Modal
    open={open}
    title={title}
    size="sm"
    onClose={loading ? () => {} : onClose}
    footer={
      <>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="min-h-10 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-gray-300 transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.12] px-4 text-sm font-medium text-red-200 transition hover:border-red-400/40 hover:bg-red-400/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : null}
          {confirmLabel}
        </button>
      </>
    }
  >
    <div className="flex gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/[0.08] text-amber-300">
        <AlertTriangle size={18} />
      </div>

      <p className="text-sm leading-6 text-gray-400">{message}</p>
    </div>

    {error ? (
      <p
        role="alert"
        className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.07] px-3 py-2.5 text-xs text-red-300"
      >
        {error}
      </p>
    ) : null}
  </Modal>
);

export default ConfirmDialog;
