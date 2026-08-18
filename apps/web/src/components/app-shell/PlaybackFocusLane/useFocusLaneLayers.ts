import type { PlaybackFocusLaneState } from "@/lib/playbackFocus/resolvePlaybackFocusFixture";

import { useFocusLaneVisibility } from "./useFocusLaneVisibility";

/**
 * Shared fade-lifecycle + cross-suppression logic for the four focus-lane
 * layers. subtitle and nowPlayingIdentity occupy distinct screen space
 * (center vs. bottom-left) so neither suppresses the other; titleIntro and
 * artistIntro remain mutually exclusive since both are centered.
 */
export function useFocusLaneLayers(focusLaneState: PlaybackFocusLaneState) {
  const subtitleLane = useFocusLaneVisibility(focusLaneState.subtitle);
  const artistIntroLane = useFocusLaneVisibility(focusLaneState.artistIntro);
  const titleIntroLane = useFocusLaneVisibility(focusLaneState.titleIntro);
  const nowPlayingLane = useFocusLaneVisibility(focusLaneState.nowPlayingIdentity);

  const hasArtistIntro = Boolean(
    focusLaneState.titleIntro.type === "none" &&
      artistIntroLane.displayFixture &&
      artistIntroLane.displayFixture.type !== "none",
  );
  const hasTitleIntro = Boolean(
    focusLaneState.artistIntro.type === "none" &&
      titleIntroLane.displayFixture &&
      titleIntroLane.displayFixture.type !== "none",
  );
  const hasSubtitle = Boolean(
    subtitleLane.displayFixture && subtitleLane.displayFixture.type !== "none",
  );
  const hasNowPlaying = Boolean(
    nowPlayingLane.displayFixture && nowPlayingLane.displayFixture.type !== "none",
  );

  const variantClass =
    titleIntroLane.variantClass ||
    artistIntroLane.variantClass ||
    nowPlayingLane.variantClass ||
    subtitleLane.variantClass;

  const layerVisible =
    artistIntroLane.layerVisible ||
    subtitleLane.layerVisible ||
    titleIntroLane.layerVisible ||
    nowPlayingLane.layerVisible;

  return {
    subtitleLane,
    artistIntroLane,
    titleIntroLane,
    nowPlayingLane,
    hasArtistIntro,
    hasTitleIntro,
    hasSubtitle,
    hasNowPlaying,
    hasAnyLayer: hasArtistIntro || hasSubtitle || hasTitleIntro || hasNowPlaying,
    variantClass,
    layerVisible,
  };
}

export type FocusLaneLayers = ReturnType<typeof useFocusLaneLayers>;
