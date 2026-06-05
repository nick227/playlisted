import { User } from "lucide-react";
import { Link } from "react-router-dom";

export function AuthLinks() {
  return (
    <>
      <Link
        to="/login"
        className="hidden rounded-full px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] transition hover:text-white sm:inline"
      >
        Log in
      </Link>
      <Link
        to="/register"
        className="hidden rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 sm:inline"
      >
        Sign up
      </Link>
      <Link
        to="/login"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] sm:hidden"
        aria-label="Log in"
      >
        <User size={18} />
      </Link>
    </>
  );
}
