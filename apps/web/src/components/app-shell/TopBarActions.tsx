import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { panelPathForRole } from "@/lib/routes";
import { useAuth } from "@/providers/AuthProvider";

import { AuthLinks } from "./AuthLinks";
import { PanelShortcutLink } from "./PanelShortcutLink";
import { SubtitlesToggleButton } from "./SubtitlesToggleButton";
import { TheatreModeButton } from "./TheatreModeButton";
import { UserAccountMenu } from "./UserAccountMenu";

interface TopBarActionsProps {
  mobileSearchOpen: boolean;
}

export function TopBarActions({ mobileSearchOpen }: TopBarActionsProps) {
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
    <div
      className={`relative flex shrink-0 items-center gap-1.5 sm:gap-2 ${
        mobileSearchOpen ? "ml-auto" : "sm:ml-auto"
      }`}
    >
      <SubtitlesToggleButton />
      <TheatreModeButton />

      {status === "authenticated" && user ? (
        <>
          <PanelShortcutLink panelPath={panelPath} />
          <UserAccountMenu
            user={user}
            panelPath={panelPath}
            open={menuOpen}
            onToggle={() => setMenuOpen((open) => !open)}
            onClose={() => setMenuOpen(false)}
            onLogout={handleLogout}
          />
        </>
      ) : status !== "loading" ? (
        <AuthLinks />
      ) : null}
    </div>
  );
}
