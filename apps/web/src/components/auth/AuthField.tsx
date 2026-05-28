import type { InputHTMLAttributes } from "react";

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function AuthField({ label, hint, error, id, className = "", ...props }: AuthFieldProps) {
  const fieldId = id ?? props.name;

  return (
    <div className="space-y-2">
      <label htmlFor={fieldId} className="block text-sm font-semibold text-white">
        {label}
      </label>
      <input
        id={fieldId}
        className={`w-full rounded-xl border bg-[var(--color-surface)] px-4 py-3.5 text-base text-white outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/30 ${
          error ? "border-red-500/60" : "border-[var(--color-border)]"
        } ${className}`}
        {...props}
      />
      {hint && !error ? <p className="text-xs text-[var(--color-text-subtle)]">{hint}</p> : null}
      {error ? <p className="text-xs font-medium text-red-400">{error}</p> : null}
    </div>
  );
}
