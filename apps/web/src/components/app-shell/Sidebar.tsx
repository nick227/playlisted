import { BookOpen, Heart, Home, ListMusic, Lock, Plus, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";

import { usePlaylists } from "@/hooks/usePlaylists";
import { ADMIN_PATH, panelPathForRole, playlistPath } from "@/lib/routes";
import { useAuth } from "@/providers/AuthProvider";

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const discoverLinks = [
  { to: "/", label: "Home", icon: Home },
];

const libraryLinks = [
  { to: "/library", label: "Library", icon: BookOpen },
  { to: "/library/favorites", label: "Favorites", icon: Heart },
];

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Home }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
          isActive ? "bg-white/10 text-white" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-white"
        }`
      }
    >
      <Icon size={20} />
      {label}
    </NavLink>
  );
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const { data } = usePlaylists(12, user?.id);
  const panelPath = user ? panelPathForRole(user.role) : null;

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
          aria-label="Close menu"
        />
      ) : null}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[var(--spacing-sidebar)] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-canvas)] transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
          <div>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
              Discover
            </p>
            <div className="flex flex-col gap-0.5">
              {discoverLinks.map((link) => (
                <NavItem key={link.to} {...link} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
              Library
            </p>
            <div className="flex flex-col gap-0.5">
              {libraryLinks.map((link) => (
                <NavItem key={link.to} {...link} />
              ))}
            </div>
          </div>
          {panelPath ? (
            <div>
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                Manage
              </p>
              <NavLink
                to={panelPath}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-white"
                  }`
                }
              >
                <Settings size={20} />
                {panelPath === ADMIN_PATH ? "Admin panel" : "Artist studio"}
              </NavLink>
            </div>
          ) : null}
          <div>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
              Create
            </p>
            <NavLink
              to="/playlists/new"
              className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
            >
              <Plus size={18} />
              Collections
            </NavLink>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
              <ListMusic size={14} />
              Collections
            </p>
            <div className="flex flex-col gap-0.5">
              {data?.data.map((playlist) => (
                <NavLink
                  key={playlist.id}
                  to={playlistPath({
                    id: playlist.id,
                    href: playlist.href,
                    username: playlist.owner.username,
                    slug: playlist.slug,
                  })}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-1.5 text-sm transition ${
                      isActive ? "text-white" : "text-[var(--color-text-muted)] hover:text-white"
                    }`
                  }
                >
                  <span className="flex items-center gap-2 truncate">
                    {playlist.visibility === "PRIVATE" ? <Lock size={14} className="shrink-0 opacity-70" /> : null}
                    <span className="truncate">{playlist.title}</span>
                  </span>
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
}
