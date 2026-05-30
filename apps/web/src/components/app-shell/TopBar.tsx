import { LogOut, Menu, Settings, User } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { SearchAutocomplete } from "@/components/search/SearchAutocomplete";
import { ADMIN_PATH, STUDIO_PATH, panelPathForRole, profilePath } from "@/lib/routes";
import { useAuth } from "@/providers/AuthProvider";

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const navigate = useNavigate();
  const { status, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    navigate("/");
  }

  const panelPath = user ? panelPathForRole(user.role) : null;

  return (
    <header className="sticky top-0 z-40 flex h-[var(--spacing-topbar)] w-full min-w-0 max-w-full shrink-0 items-center gap-4 overflow-x-clip border-b border-[var(--color-border)] bg-[var(--color-canvas)]/95 px-4 backdrop-blur-md">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-white lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>
      <Link to="/" className="shrink-0 text-lg font-bold tracking-tight text-white">
        Play<span className="text-[var(--color-brand)]">Listed</span>
      </Link>
      <SearchAutocomplete className="mx-auto hidden max-w-xl flex-1 md:block" />
      <div className="relative ml-auto flex items-center gap-2">
        {status === "authenticated" && user ? (
          <>
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
