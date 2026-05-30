import { PanelsTopLeft, BookOpen, Code2, Heart, Home, ListMusic, Lock, Plus, Settings, type LucideIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink, useNavigate } from "react-router-dom";

import { useCollectionPlaylists } from "@/hooks/useCollections";
import { usePlaylists } from "@/hooks/usePlaylists";
import { authedApi } from "@/lib/authedApi";
import { ADMIN_PATH, panelPathForRole, playlistPath, studioCollectionEditPath } from "@/lib/routes";
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

const baseNavClass = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition";
const inactiveNavClass = "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-white";
const activeNavClass = "bg-white/10 text-white shadow-inner";

function navClass(isActive: boolean, extra = "") {
  return `${baseNavClass} ${isActive ? activeNavClass : inactiveNavClass} ${extra}`.trim();
}

function NavItem({
  to,
  label,
  icon: Icon,
  onClick,
  end = true,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) => navClass(isActive)}
    >
      <Icon size={20} />
      {label}
    </NavLink>
  );
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { user, accessToken } = useAuth();
  const client = authedApi(accessToken);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: ownedCollections } = usePlaylists(12, user?.id);
  const { data: savedCollections } = useCollectionPlaylists(12);
  const panelPath = user ? panelPathForRole(user.role) : null;
  const collections = [
    ...(ownedCollections?.data ?? []),
    ...(savedCollections?.data ?? []),
  ].filter((playlist, index, all) => all.findIndex((item) => item.id === playlist.id) === index);

  const createCollectionMutation = useMutation({
    mutationFn: () =>
      client.playlists.create({
        ownerId: user!.id,
        title: "Untitled collection",
        type: "PLAYLIST",
        status: "PUBLISHED",
        visibility: "PUBLIC",
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
      onClose();
      navigate(studioCollectionEditPath(created.id));
    },
  });

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
            <NavLink to="/" onClick={onClose} className="text-4xl font-bold tracking-tight text-white">
              Play<span className="text-[var(--color-brand)]">listed</span>
            </NavLink>
            <div className="flex flex-col gap-0.5 mt-4">
              {discoverLinks.map((link) => (
                <NavItem key={link.to} {...link} onClick={onClose} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
              Library
            </p>
            <div className="flex flex-col gap-0.5">
              {libraryLinks.map((link) => (
                <NavItem key={link.to} {...link} onClick={onClose} />
              ))}
            </div>
          </div>
          <div>
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                Manage
              </p>
          {panelPath === ADMIN_PATH ? (
              <NavLink
                to={panelPath}
                onClick={onClose}
                end={panelPath !== ADMIN_PATH}
                className={({ isActive }) => navClass(isActive)}
              >
                <Settings size={20} />
                {panelPath === ADMIN_PATH ? "Admin panel" : "Artist studio"}
              </NavLink>
          ) : null}
          {panelPath ? (
              <NavLink
                to="/studio/"
                onClick={onClose}
                className={({ isActive }) => navClass(isActive)}
              >
                <PanelsTopLeft size={18} />
                My Studio
              </NavLink>
          ) : null}
          </div>
          <div>
            <p className="mb-2 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
              <ListMusic size={14} />
              Collections
            </p>
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => {
                  if (!user || createCollectionMutation.isPending) return;
                  createCollectionMutation.mutate();
                }}
                disabled={!user || createCollectionMutation.isPending}
                className={navClass(false, "text-left disabled:opacity-60 cursor-pointer")}
              >
                <Plus size={20} />
                {createCollectionMutation.isPending ? "Creating..." : "Add Collection"}
              </button>
              {collections.map((playlist) => (
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
                    [
                      "rounded-lg px-3 py-1.5 text-sm transition",
                      isActive
                        ? "bg-white/10 text-white shadow-inner"
                        : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-white",
                    ].join(" ")
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
