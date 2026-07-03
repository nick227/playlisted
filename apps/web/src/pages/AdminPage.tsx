import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";

const NAV = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/traffic", label: "Traffic" },
  { to: "/admin/songs", label: "Songs" },
  { to: "/admin/playlists", label: "Playlists" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/theatre", label: "Theatre" },
  { to: "/admin/tags", label: "Tags" },
  { to: "/admin/api-keys", label: "API Keys" },
  { to: "/admin/radio", label: "Radio", roles: ["ADMIN"] },
];

export function AdminPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-5xl space-y-8 bg-black/90 p-4 rounded-lg min-h-screen">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Administration</p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-white">Control center</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Signed in as <span className="font-medium text-white">{user?.displayName}</span> ({user?.role}).
        </p>
      </div>

      <nav className="flex gap-1 border-b border-[var(--color-border)] md:mx-0">
        {NAV.filter((item) => item.roles?.includes(user?.role ?? "") ?? true).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={(item as any).end}
            className={({ isActive }) =>
              `px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px whitespace-nowrap bg-black ${
                isActive
                  ? "border-amber-400 text-white"
                  : "border-transparent text-[var(--color-text-muted)] hover:text-white"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
