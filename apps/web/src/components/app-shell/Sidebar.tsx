import {
  BarChart3,
  Heart,
  Home,
  Lock,
  Mic2,
  PanelsTopLeft,
  Plus,
  MessageCircle,
  Settings,
  RadioIcon,
  type LucideIcon,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";

import { useCollectionPlaylists } from "@/hooks/useCollections";
import { usePlaylists } from "@/hooks/usePlaylists";
import { authedApi } from "@/lib/authedApi";
import { playbackFocusTiming } from "@/lib/playbackFocusTiming";
import { usePlaybackFocusSuppressed } from "@/lib/playbackFocusSuppression";
import { CHARTS_PATH, FAVORITES_PATH, LIBRARY_PATH, CHAT_PATH } from "@/lib/browsePaths";
import { ADMIN_PATH, panelPathForRole, playlistPath, studioCollectionEditPath } from "@/lib/routes";
import { useAuth } from "@/providers/AuthProvider";

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const discoverLinks = [
  { to: "/", label: "Home", icon: Home },
  { to: CHARTS_PATH, label: "Charts", icon: BarChart3 },
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
  const blurTimerRef = useRef<number | null>(null);
  const playbackFocusSuppressed = usePlaybackFocusSuppressed();
  const { status, user, accessToken } = useAuth();
  const client = authedApi(accessToken);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCollectionsSignIn, setShowCollectionsSignIn] = useState(false);
  const [navDimmed, setNavDimmed] = useState(false);
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

  const clearBlurTimer = useCallback(() => {
    if (blurTimerRef.current === null) return;
    window.clearTimeout(blurTimerRef.current);
    blurTimerRef.current = null;
  }, []);

  const showNav = useCallback(() => {
    clearBlurTimer();
    setNavDimmed(false);
  }, [clearBlurTimer]);

  const scheduleNavFade = useCallback(() => {
    clearBlurTimer();
    if (mobileOpen || playbackFocusSuppressed) return;
    blurTimerRef.current = window.setTimeout(() => {
      setNavDimmed(true);
      blurTimerRef.current = null;
    }, playbackFocusTiming.sidebarNav.blurDelayMs);
  }, [clearBlurTimer, mobileOpen, playbackFocusSuppressed]);

  useEffect(() => {
    if (playbackFocusSuppressed) {
      showNav();
    }
  }, [playbackFocusSuppressed, showNav]);

  useEffect(() => {
    if (mobileOpen) {
      showNav();
      return;
    }

    scheduleNavFade();
    return clearBlurTimer;
  }, [clearBlurTimer, mobileOpen, scheduleNavFade, showNav]);

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[10055] bg-black/60 lg:hidden"
          onClick={onClose}
          aria-label="Close menu"
        />
      ) : null}
      <aside
        onMouseEnter={showNav}
        onMouseLeave={scheduleNavFade}
        onFocus={showNav}
        onBlur={(event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return;
          scheduleNavFade();
        }}
        className={`fixed left-0 top-0 z-[10060] flex h-full w-[var(--spacing-sidebar)] max-w-[85vw] shrink-0 flex-col transition-transform lg:z-40 lg:translate-x-0 lg:bg-transparent lg:shadow-none lg:backdrop-blur-none ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full max-lg:invisible max-lg:pointer-events-none lg:translate-x-0"
        }`}
      >
        <nav className={`sidebar-nav-content flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4`}>
          <div>
            <NavLink to="/" onClick={onClose} className="flex items-center gap-2 text-4xl font-bold tracking-tight text-white">
              Play<span className="text-[var(--color-brand)]">listed</span> <RadioIcon size={20} />
            </NavLink>
            <div className={`flex flex-col gap-0.5 bg-[var(--color-canvas)]/90 -ml-4 mt-2 p-2 ${navDimmed ? "opacity-0" : "opacity-100"} transition-opacity`}>
              {discoverLinks.map((link) => (
                <NavItem key={link.to} {...link} onClick={onClose} />
              ))}
              
              <NavItem to={FAVORITES_PATH} label="Favorites" icon={Heart} onClick={onClose} />
              <NavItem to={LIBRARY_PATH} label="Library" icon={Mic2} onClick={onClose} />
              <NavItem to={CHAT_PATH} label="Chat" icon={MessageCircle} onClick={onClose} />
              
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
                {createCollectionMutation.isPending ? "Creating..." : "Add Songs"}
              </button>
              {showCollectionsSignIn && !isAuthenticated ? (
                <div className="mx-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3">
                  <p className="text-sm font-semibold text-white">Sign in to create collections</p>
                  <p className="my-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
                    Collections and playlists are saved to your profile.
                  </p>
                  <Link to="/login" className="mt-4 text-sm text-white hover:underline">Sign in</Link> 
                  <span className="text-xs text-[var(--color-text-muted)] mx-2">or</span>
                  <Link to="/register" className="mt-4 text-sm text-white hover:underline">Register</Link>
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
          </div>
        </nav>
      </aside>
    </>
  );
}
