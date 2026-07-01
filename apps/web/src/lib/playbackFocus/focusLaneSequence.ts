import { playbackFocusTiming } from "@/lib/playbackFocusTiming";

export function getFocusLaneSequenceWindows() {
  const { titleIntro, artistVisual, fallbackSubtitle } = playbackFocusTiming;

  const titleStart = titleIntro.delayMs;
  const titleEnd = titleStart + titleIntro.minVisibleMs + titleIntro.fadeOutMs;
  const artistStart = titleEnd + artistVisual.gapAfterTitleIntroMs;
  const artistEnd = artistStart + artistVisual.minVisibleMs;
  const fallbackStart = artistEnd + fallbackSubtitle.gapAfterArtistMs;

  return { titleStart, titleEnd, artistStart, artistEnd, fallbackStart };
}

export function getFocusLaneElapsedMs(currentTimeMs: number, bodyFadedAtTrackMs: number | null): number {
  if (bodyFadedAtTrackMs == null) return 0;
  return Math.max(0, currentTimeMs - bodyFadedAtTrackMs);
}
