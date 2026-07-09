import { useState } from "react";

import { TopBarActions } from "./TopBarActions";
import { TopBarBrand } from "./TopBarBrand";
import { TopBarMenuButton } from "./TopBarMenuButton";
import { TopBarSearch } from "./TopBarSearch";

interface TopBarProps {
  onMenuClick: () => void;
  cinematicBgTransparent?: boolean;
}

/**
 * Top bar layout uses Tailwind `sm` (640px) as the mobile/desktop split.
 *
 * MOBILE (< sm) — two masthead + search states:
 *   • Closed (default): hamburger · full "Playlisted" wordmark + logo · [search icon + actions right-aligned]
 *   • Open:             hamburger · "PL" mini mark · expanded search field · actions
 *     (blurring the input restores closed view after 2s; Escape / pick result closes immediately)
 *
 * DESKTOP (sm+):
 *   • Always-on centered search combobox; no in-bar wordmark (sidebar has branding).
 *   • Guest users see a blank profile button that links to sign in.
 *   • Hamburger hidden from lg up (persistent sidebar).
 */
export function TopBar({ onMenuClick, cinematicBgTransparent = false }: TopBarProps) {
  /** Mobile-only: false = icon trigger + full wordmark; true = expanded search + PL mini. */
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header
      className={`topbar-chrome sticky top-0 z-40 flex h-[var(--spacing-topbar)] w-full min-w-0 max-w-full shrink-0 items-center gap-1.5 overflow-x-clip border-b border-[var(--color-border)] px-2 backdrop-blur-md sm:relative sm:gap-3 sm:px-4${
        cinematicBgTransparent ? " is-play-focus-bg-transparent" : ""
      }`}
    >
      <TopBarMenuButton onClick={onMenuClick} />
      <TopBarBrand mobileSearchOpen={mobileSearchOpen} />
      {mobileSearchOpen ? (
        <>
          <TopBarSearch
            mobileSearchOpen={mobileSearchOpen}
            onMobileSearchOpenChange={setMobileSearchOpen}
          />
          <TopBarActions mobileSearchOpen={mobileSearchOpen} />
        </>
      ) : (
        <>
          <div className="min-w-0 flex-1 sm:hidden" aria-hidden />
          <div className="sm:hidden">
            <TopBarSearch
              mobileSearchOpen={mobileSearchOpen}
              onMobileSearchOpenChange={setMobileSearchOpen}
            />
          </div>
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 block w-[calc(100%-12rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 max-sm:hidden">
            <div className="pointer-events-auto w-full">
              <TopBarSearch
                mobileSearchOpen={mobileSearchOpen}
                onMobileSearchOpenChange={setMobileSearchOpen}
              />
            </div>
          </div>
          <TopBarActions mobileSearchOpen={mobileSearchOpen} />
        </>
      )}
    </header>
  );
}
