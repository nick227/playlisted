import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { SiteTopTenSection } from "@/components/charts/SiteTopTenSection";
import { HomeIntro } from "@/components/home/HomeIntro";
import { LibraryFeedSection } from "@/components/library/LibraryFeedSection";
import { PersonalFavoritesSection } from "@/components/library/PersonalFavoritesSection";
import { RadioSection } from "@/components/radio/RadioSection";
import { useHoldRouteUntilCached } from "@/hooks/useHoldRouteUntilCached";
import {
  libraryArtistsQueryOptions,
  libraryGenresQueryOptions,
  librarySongsQueryOptions,
} from "@/hooks/useLibrary";
import { usePageMeta } from "@/hooks/usePageMeta";
import { LIBRARY_FEED_LAYOUT_CLASS } from "@/lib/browsePaths";
import { radioStationQueryOptions, useRadioPlayer } from "@/providers/RadioPlayerProvider";

/** Scroll to `#radio` / `#charts` / `#personal` / `#library` (legacy route redirects land here). */
function useHashSectionScroll() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    target?.scrollIntoView({ block: "start" });
  }, [hash]);
}

/** Community introduction, radio, charts, favorites, and the library feed. */
export function HomePage() {
  usePageMeta({
    title: "Home",
    description: "A community for music makers and music lovers. Post your songs, discover your next favorite, and listen together on Playlisted.",
  });
  useHashSectionScroll();
  // Wait for radio data so section hash links land at a stable position.
  // Last hook: suspending anywhere earlier would change the hook list between attempts.
  const { activeStationSlug } = useRadioPlayer();
  // The artist intro fills the first viewport and is built from artists + songs.
  useHoldRouteUntilCached(
    libraryArtistsQueryOptions(),
    librarySongsQueryOptions(null),
    radioStationQueryOptions(activeStationSlug),
    libraryGenresQueryOptions({ minSongCount: 1 }),
  );

  return (
    <div className={`${LIBRARY_FEED_LAYOUT_CLASS} flex flex-col gap-10 md:gap-12`}>
      <HomeIntro />
      <RadioSection />
      <SiteTopTenSection />
      <PersonalFavoritesSection />
      <LibraryFeedSection />
    </div>
  );
}
