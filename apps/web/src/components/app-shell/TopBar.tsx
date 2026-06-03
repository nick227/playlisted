import { LogOut, Menu, Settings, User, Monitor, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import { PlaylistedMasthead } from "@/components/app-shell/PlaylistedMasthead";
import { SearchAutocomplete } from "@/components/search/SearchAutocomplete";
import { ADMIN_PATH, STUDIO_PATH, panelPathForRole, profilePath } from "@/lib/routes";
import { useAuth } from "@/providers/AuthProvider";
import theatreController from '@/theatre/lazyController'

interface TopBarProps {
  onMenuClick: () => void;
}

/**
 * Top bar layout uses Tailwind `sm` (640px) as the mobile/desktop split.
 *
 * MOBILE (< sm) — two masthead + search states:
 *   • Closed (default): hamburger · full "Playlisted" wordmark · [search icon + actions right-aligned]
 *   • Open:             hamburger · "PL" mini mark · expanded search field · actions
 *     (blurring the input restores closed view after 2s; Escape / pick result closes immediately)
 *
 * DESKTOP (sm+):
 *   • Always-on centered search combobox; no in-bar wordmark (sidebar has branding).
 *   • Login / sign-up links replace the mobile avatar shortcut.
 *   • Hamburger hidden from lg up (persistent sidebar).
 */
export function TopBar({ onMenuClick }: TopBarProps) {
  const navigate = useNavigate();
  const { status, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  /** Mobile-only: false = icon trigger + full wordmark; true = expanded search + PL mini. */
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [canEnterTheatre, setCanEnterTheatre] = useState(theatreController.state.canEnter)
  const [theatreActive, setTheatreActive] = useState(theatreController.state.active)
  const [theatreLoading, setTheatreLoading] = useState(false)

  useEffect(() => {
    const sync = () => {
      setCanEnterTheatre(theatreController.state.canEnter)
      setTheatreActive(theatreController.state.active)
    }
    const onEnter = () => { sync(); setTheatreLoading(false) }
    const onExit  = () => { sync(); setTheatreLoading(false) }
    theatreController.addEventListener('change', sync)
    theatreController.addEventListener('enter', onEnter)
    theatreController.addEventListener('exit', onExit)
    return () => {
      theatreController.removeEventListener('change', sync)
      theatreController.removeEventListener('enter', onEnter)
      theatreController.removeEventListener('exit', onExit)
    }
  }, [])

  async function handleTheatreClick() {
    if (theatreActive) {
      void theatreController.exit()
      return
    }
    setTheatreLoading(true)
    try {
      await theatreController.toggle()
    } catch {
      setTheatreLoading(false)
    }
  }

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    navigate("/");
  }

  const panelPath = user ? panelPathForRole(user.role) : null;

  return (
    <header className="sticky top-0 z-40 flex h-[var(--spacing-topbar)] w-full min-w-0 max-w-full shrink-0 items-center gap-1.5 sm:gap-3 overflow-x-clip border-b border-[var(--color-border)] bg-[var(--color-canvas)]/95 px-2 sm:px-4 backdrop-blur-md">
      {/* Mobile drawer trigger — hidden on lg+ where sidebar is always visible */}
      <button
        type="button"
        onClick={onMenuClick}
        className="shrink-0 rounded-lg p-1.5 sm:p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-white lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* MOBILE ONLY: full wordmark when search closed, PL mini when search open */}
      <PlaylistedMasthead
        variant={mobileSearchOpen ? "mini" : "full"}
        className="shrink-0 text-base transition-opacity duration-300 motion-reduce:transition-none sm:hidden"
      />

      {/* MOBILE closed: grow spacer so search icon sits flush with action buttons */}
      {!mobileSearchOpen ? <div className="min-w-0 flex-1 sm:hidden" aria-hidden /> : null}

      {/* Search: collapsible on mobile; always expanded from sm+ */}
      <SearchAutocomplete
        className={
          mobileSearchOpen
            ? "min-w-0 flex-1 sm:mx-auto sm:max-w-xl"
            : "shrink-0 sm:min-w-0 sm:flex-1 sm:mx-auto sm:max-w-xl"
        }
        mobileExpanded={mobileSearchOpen}
        onMobileExpandedChange={setMobileSearchOpen}
      />

      {/* Right-side actions — theatre, auth, account menu */}
      <div
        className={`relative flex shrink-0 items-center gap-1.5 sm:gap-2 ${
          mobileSearchOpen ? "ml-auto" : "sm:ml-auto"
        }`}
      >
        <button
          type="button"
          onClick={handleTheatreClick}
          disabled={theatreLoading || (!theatreActive && !canEnterTheatre)}
          className={`inline-flex bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg p-1.5 sm:p-2 transition disabled:cursor-not-allowed disabled:opacity-40 ${theatreActive ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-white'}`}
          title={theatreLoading ? 'Loading theatre…' : theatreActive ? 'Exit Theatre Mode' : canEnterTheatre ? 'Enter Theatre Mode' : 'Play music to enter Theatre Mode'}
          aria-busy={theatreLoading}
        >
          {theatreLoading
            ? <Loader2 size={20} className="animate-spin" />
            : <Monitor size={20} />}
        </button>

        {status === "authenticated" && user ? (
          <>
            {/* Studio / Admin pills — desktop only */}
            {panelPath === STUDIO_PATH ? (
              <Link
                to={STUDIO_PATH}
                className="hidden rounded-full border border-[var(--color-brand)]/40 bg-[var(--color-brand)]/10 px-4 py-2 text-sm font-semibold text-white sm:inline"
              >
                Studio
              </Link>
            ) : null}
            {panelPath === ADMIN_PATH ? (
              <Link
                to={ADMIN_PATH}
                className="hidden rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 sm:inline"
              >
                Admin
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-1.5 pl-1.5 pr-3 text-sm font-medium text-white"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand)]/30">
                  <User size={16} />
                </span>
              )}
              <span className="hidden max-w-[8rem] truncate sm:inline">{user.displayName}</span>
            </button>
            {menuOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                />
                <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-1 shadow-xl">
                  <Link
                    to={profilePath(user.username)}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/5"
                  >
                    <User size={16} />
                    Profile
                  </Link>
                  {panelPath ? (
                    <Link
                      to={panelPath}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/5"
                    >
                      <Settings size={16} />
                      {panelPath === ADMIN_PATH ? "Admin panel" : "Artist studio"}
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-300 hover:bg-white/5"
                  >
                    <LogOut size={16} />
                    Log out
                  </button>
                </div>
              </>
            ) : null}
          </>
        ) : status !== "loading" ? (
          <>
            {/* Desktop auth links */}
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
            {/* Mobile auth shortcut — icon only */}
            <Link
              to="/login"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] sm:hidden"
              aria-label="Log in"
            >
              <User size={18} />
            </Link>
          </>
        ) : null}
      </div>
    </header>
  );
}
