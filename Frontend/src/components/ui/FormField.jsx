import { useId } from "react";

export const controlClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-cyan-400/40 focus:bg-white/[0.05] focus:ring-2 focus:ring-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Labelled input/select with inline validation messaging.
 * Pass `options` to render a select instead of an input.
 */
const FormField = ({
  label,
  error,
  hint,
  required = false,
  options,
  className = "",
  ...controlProps
}) => {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;

  const stateClass = error
    ? "border-red-400/50 focus:border-red-400/60 focus:ring-red-400/15"
    : "";

  return (
    <div className={className}>
      <label
        htmlFor={fieldId}
        className="mb-1.5 block text-xs font-medium text-gray-400"
      >
        {label}
        {required ? (
          <span className="ml-1 text-red-400" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {options ? (
        <select
          id={fieldId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`${controlClass} ${stateClass}`}
          {...controlProps}
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-[#0a0e15]"
            >
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={fieldId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`${controlClass} ${stateClass}`}
          {...controlProps}
        />
      )}

      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-[11px] text-gray-600">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-[11px] text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
};

export default FormField;
