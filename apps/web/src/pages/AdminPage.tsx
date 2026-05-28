import { useAuth } from "@/providers/AuthProvider";

export function AdminPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Administration</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">Control center</h1>
      <p className="mt-4 text-[var(--color-text-muted)]">
        Signed in as <span className="font-medium text-white">{user?.displayName}</span> ({user?.role}).
        Catalog review, user management, and homepage curation tools will live here.
      </p>
      <ul className="mt-8 space-y-3 text-sm text-[var(--color-text-muted)]">
        <li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          Catalog moderation — coming soon
        </li>
        <li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          Featured artists & homepage — coming soon
        </li>
        <li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          User roles & invites — coming soon
        </li>
      </ul>
    </div>
  );
}
