import type { AuthUser } from "@playlisted/client-sdk";
import { LogOut, Settings, User } from "lucide-react";
import { Link } from "react-router-dom";

import { ADMIN_PATH, profilePath } from "@/lib/routes";

interface UserAccountMenuProps {
  user: AuthUser;
  panelPath: string | null;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onLogout: () => void | Promise<void>;
}

export function UserAccountMenu({
  user,
  panelPath,
  open,
  onToggle,
  onClose,
  onLogout,
}: UserAccountMenuProps) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-1.5 pl-1.5 pr-3 text-sm font-medium text-white"
        aria-expanded={open}
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

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            onClick={onClose}
            aria-label="Close menu"
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-1 shadow-xl">
            <Link
              to={profilePath(user.username)}
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/5"
            >
              <User size={16} />
              Profile
            </Link>
            {panelPath ? (
              <Link
                to={panelPath}
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/5"
              >
                <Settings size={16} />
                {panelPath === ADMIN_PATH ? "Admin panel" : "Artist studio"}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-300 hover:bg-white/5"
            >
              <LogOut size={16} />
              Log out
            </button>
          </div>
        </>
      ) : null}
    </>
  );
}
