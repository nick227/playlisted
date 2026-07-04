import {
  BarChart3,
  Heart,
  Home,
  PanelsTopLeft,
  Settings,
  RadioIcon,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";

import { playbackFocusTiming } from "@/lib/playbackFocusTiming";
import { usePlaybackFocusSuppressed } from "@/lib/playbackFocusSuppression";
import { CHARTS_PATH, FAVORITES_PATH } from "@/lib/browsePaths";
import { ADMIN_PATH, panelPathForRole, STUDIO_PATH } from "@/lib/routes";
import { useAuth } from "@/providers/AuthProvider";

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const discoverLinks = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: CHARTS_PATH, label: "Charts", icon: BarChart3, end: true },
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
  const { user } = useAuth();
  const [navDimmed, setNavDimmed] = useState(false);
  const panelPath = user ? panelPathForRole(user.role) : null;
  const showAdminLink = panelPath === ADMIN_PATH;
  const showStudioLink = panelPath != null;

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
              {showAdminLink ? (
                <NavItem
                  to={ADMIN_PATH}
                  label="Admin panel"
                  icon={Settings}
                  onClick={onClose}
                  end={false}
                />
              ) : null}
              {showStudioLink ? (
                <NavItem
                  to={STUDIO_PATH}
                  label="Studio"
                  icon={PanelsTopLeft}
                  onClick={onClose}
                  end={false}
                />
              ) : null}
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
}
