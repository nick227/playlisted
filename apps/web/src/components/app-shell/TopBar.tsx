import { useState } from "react";

import { TopBarActions } from "./TopBarActions";
import { TopBarBrand } from "./TopBarBrand";
import { TopBarMenuButton } from "./TopBarMenuButton";
import { TopBarSearch } from "./TopBarSearch";

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
  /** Mobile-only: false = icon trigger + full wordmark; true = expanded search + PL mini. */
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-[var(--spacing-topbar)] w-full min-w-0 max-w-full shrink-0 items-center gap-1.5 sm:gap-3 overflow-x-clip border-b border-[var(--color-border)] bg-[var(--color-canvas)]/95 px-2 sm:px-4 backdrop-blur-md">
      <TopBarMenuButton onClick={onMenuClick} />
      <TopBarBrand mobileSearchOpen={mobileSearchOpen} />
      {!mobileSearchOpen ? <div className="min-w-0 flex-1 sm:hidden" aria-hidden /> : null}
      <TopBarSearch
        mobileSearchOpen={mobileSearchOpen}
        onMobileSearchOpenChange={setMobileSearchOpen}
      />
      <TopBarActions mobileSearchOpen={mobileSearchOpen} />
    </header>
  );
}
