import {
  AudioLines,
  BookOpen,
  Heart,
  Home,
  ListMusic,
  Lock,
  Mic2,
  PanelsTopLeft,
  Plus,
  Radio,
  Settings,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import { useCollectionPlaylists } from "@/hooks/useCollections";
import { usePlaylists } from "@/hooks/usePlaylists";
import { authedApi } from "@/lib/authedApi";
import {
  ARTISTS_PATH,
  FAVORITES_PATH,
  GENRES_PATH,
  LIBRARY_PATH,
  PLAYLISTS_PATH,
  SONGS_PATH,
} from "@/lib/browsePaths";
import { ADMIN_PATH, panelPathForRole, playlistPath, studioCollectionEditPath } from "@/lib/routes";
import { useAuth } from "@/providers/AuthProvider";

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const discoverLinks = [
  { to: "/", label: "Home", icon: Home },
  { to: "/radio", label: "Radio", icon: Radio },
];

const libraryBrowseLinks = [
  { to: SONGS_PATH, label: "Songs", icon: AudioLines },
  { to: GENRES_PATH, label: "Genres", icon: Tags },
  { to: ARTISTS_PATH, label: "Artists", icon: Mic2 },
  { to: PLAYLISTS_PATH, label: "Playlists", icon: ListMusic },
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

function SubNavItem({
  to,
  label,
  icon: Icon,
  onClick,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end
      onClick={onClick}
      className={({ isActive }) => navClass(isActive, "py-1.5 text-xs")}
    >
      <Icon size={16} />
      {label}
    </NavLink>
  );
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { status, user, accessToken } = useAuth();
  const client = authedApi(accessToken);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCollectionsSignIn, setShowCollectionsSignIn] = useState(false);
  const isAuthenticated = status === "authenticated" && Boolean(user);
  const { data: ownedCollections } = usePlaylists(12, user?.id, isAuthenticated);
  const { data: savedCollections } = useCollectionPlaylists(12);
  const panelPath = user ? panelPathForRole(user.role) : null;
  const collections = isAuthenticated
    ? [
        ...(ownedCollections?.data ?? []),
        ...(savedCollections?.data ?? []),
      ].filter((playlist, index, all) => all.findIndex((item) => item.id === playlist.id) === index)
    : [];

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
        className={`fixed left-0 top-0 z-50 flex h-full w-[var(--spacing-sidebar)] max-w-[85vw] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-canvas)] transition-transform lg:z-40 lg:translate-x-0 ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full max-lg:invisible max-lg:pointer-events-none lg:translate-x-0"
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
              <NavItem to={LIBRARY_PATH} label="Library" icon={BookOpen} onClick={onClose} end />
              {libraryBrowseLinks.map((link) => (
                <SubNavItem key={link.to} {...link} onClick={onClose} />
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
              <NavItem to={FAVORITES_PATH} label="Favorites" icon={Heart} onClick={onClose} />
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
                  if (!isAuthenticated) {
                    setShowCollectionsSignIn(true);
                    return;
                  }
                  if (createCollectionMutation.isPending) return;
                  createCollectionMutation.mutate();
                }}
                disabled={createCollectionMutation.isPending}
                className={navClass(false, "text-left disabled:opacity-60 cursor-pointer")}
              >
                <Plus size={20} />
                {createCollectionMutation.isPending ? "Creating..." : "Add Collection"}
              </button>
              {!isAuthenticated && showCollectionsSignIn ? (
                <div className="mx-3 mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3">
                  <p className="text-sm font-semibold text-white">Sign in to see your collections</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
                    Collections you create and playlists you save are saved to your account.
                  </p>
                </div>
              ) : null}
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
