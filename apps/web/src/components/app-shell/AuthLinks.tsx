import { Link } from "react-router-dom";

export function AuthLinks() {
  return (
    <Link
      to="/login"
      className="inline-flex shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1.5 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-white sm:p-2"
      aria-label="Sign in"
      title="Sign in"
    >
      <span
        className="block h-5 w-5 rounded-full bg-current/20"
        aria-hidden="true"
      />
    </Link>
  );
}
