import { Link } from "react-router-dom";

import { useAuth } from "@/providers/AuthProvider";
import { profilePath } from "@/lib/routes";

const links = [
  { to: "/studio/uploads", title: "Bulk upload", desc: "Add multiple tracks at once" },
  { to: "/studio/collections", title: "Collections", desc: "Albums, playlists, podcasts" },
  { to: "/studio/history", title: "Play history", desc: "Tracks you have listened to" },
  { to: "/studio/profile", title: "Profile & URL", desc: "Username and public page" },
];

export function StudioPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand)]">Artist studio</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">
        Hey, {user?.displayName}
      </h1>
      <p className="mt-4 text-[var(--color-text-muted)]">
        Build collections that look exactly like the published page. Upload in bulk, curate tracks, and share your
        profile.
      </p>

      {user ? (
        <Link
          to={profilePath(user.username)}
          className="mt-4 inline-block text-sm font-medium text-[var(--color-brand)] hover:underline"
        >
          View public profile →
        </Link>
      ) : null}

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {links.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition hover:border-[var(--color-brand)]/50"
          >
            <p className="text-lg font-bold text-white">{item.title}</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
