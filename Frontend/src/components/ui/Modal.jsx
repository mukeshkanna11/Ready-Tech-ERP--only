import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

const SIZES = {
  sm: "sm:max-w-md",
  md: "sm:max-w-2xl",
  lg: "sm:max-w-4xl",
};

/**
 * Accessible dialog shell shared by the form and confirmation modals.
 * Closes on Escape and on backdrop click, locks body scroll while open.
 */
const Modal = ({
  open,
  title,
  description,
  size = "md",
  onClose,
  children,
  footer,
}) => {
  const panelRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = panelRef.current?.querySelector(
      "input:not([type='hidden']), select, textarea, button"
    );
    focusable?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/75 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`w-full ${SIZES[size]} max-h-[92vh] overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0a0e15] shadow-2xl shadow-black/60 sm:rounded-2xl`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/[0.07] bg-[#0a0e15]/95 px-4 py-4 backdrop-blur-xl sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="truncate text-base font-semibold text-white sm:text-lg"
            >
              {title}
            </h2>

            {description ? (
              <p
                id={descriptionId}
                className="mt-1 text-xs text-gray-500 sm:text-sm"
              >
                {description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-gray-400 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-5 sm:px-6">{children}</div>

        {footer ? (
          <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-white/[0.07] bg-[#0a0e15]/95 px-4 py-4 backdrop-blur-xl sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Modal;
