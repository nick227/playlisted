import {
  Heart,
  Settings,
  RadioIcon,
  Music,
  Lock,
  type LucideIcon,
  Home,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@playlisted/client-sdk";

import { DEFAULT_COLLECTION_TITLE } from "@/components/studio/studioCollectionUtils";
import { authedApi } from "@/lib/authedApi";
import { playbackFocusTiming } from "@/lib/playbackFocusTiming";
import { usePlaybackFocusSuppressed } from "@/lib/playbackFocusSuppression";
import { FAVORITES_PATH } from "@/lib/browsePaths";
import { ADMIN_PATH, currentUserProfilePath, panelPathForRole, playlistPath, studioCollectionEditPath } from "@/lib/routes";
import { useAuth } from "@/providers/AuthProvider";

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const discoverLinks = [
  { to: "/", label: "Radio", icon: RadioIcon, end: true },
] as const;

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
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  const isAuthenticated = Boolean(user);
  const [showCollectionsSignIn, setShowCollectionsSignIn] = useState(false);
  const [navDimmed, setNavDimmed] = useState(false);
  
  const client = authedApi(accessToken);
  const queryClient = useQueryClient();

  const collectionsQuery = useQuery({
    queryKey: ["me", "playlists"],
    queryFn: () => client.me.playlists(),
    enabled: Boolean(accessToken),
  });
  const collections: components["schemas"]["PlaylistSummary"][] = collectionsQuery.data?.data ?? [];

  const createCollectionMutation = useMutation({
    mutationFn: () =>
      client.playlists.create({
        ownerId: user!.id,
        title: DEFAULT_COLLECTION_TITLE,
        type: "PLAYLIST",
        status: "PUBLISHED",
        visibility: "PUBLIC",
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
      navigate(studioCollectionEditPath(created.id));
    },
  });

  const panelPath = user ? panelPathForRole(user.role) : null;
  const profileNavPath = currentUserProfilePath(user);
  const showAdminLink = panelPath === ADMIN_PATH;

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
        <nav className="sidebar-nav-content flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
          <div>
            <NavLink
              to="/"
              end
              onClick={onClose}
              className="flex items-center gap-2 text-4xl font-bold tracking-tight text-white"
            >
              Play<span className="text-[var(--color-brand)]">listed</span> <RadioIcon size={20} />
            </NavLink>
            <div
              className={[
                "-ml-4 mt-2 flex flex-col gap-0.5 bg-[var(--color-canvas)]/90 p-2 transition-opacity",
                navDimmed ? "opacity-0" : "opacity-100",
              ].join(" ")}
            >
              {discoverLinks.map((link) => (
                <NavItem key={link.to} {...link} onClick={onClose} />
              ))}
              <NavItem to={FAVORITES_PATH} label="Favorites" icon={Heart} onClick={onClose} end />
              <NavItem to={profileNavPath} label="Profile" icon={Home} onClick={onClose} end />
              {showAdminLink ? (
                <NavItem
                  to={ADMIN_PATH}
                  label="Admin panel"
                  icon={Settings}
                  onClick={onClose}
                  end={false}
                />
              ) : null}

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
                <Music size={20} />
                {createCollectionMutation.isPending ? "Loading studio..." : "Submit Songs"}
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

              {collections ? (
                <div className="flex flex-col gap-2 mb-2 border-b border-white/[0.5] pl-4"></div>
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
                    {playlist.coverArtUrl ? (
                      <img
                        src={playlist.coverArtUrl}
                        alt=""
                        className="h-5 w-5 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/10 text-[10px] font-bold uppercase text-[var(--color-text-muted)]">
                        {playlist.title ? playlist.title.charAt(0) : "P"}
                      </span>
                    )}
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
