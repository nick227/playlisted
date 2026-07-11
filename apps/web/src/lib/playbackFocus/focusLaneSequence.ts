import { playbackFocusTiming } from "@/lib/playbackFocusTiming";

export function getFocusLaneSequenceWindows() {
  const { titleIntro, artistVisual } = playbackFocusTiming;

  const titleStart = titleIntro.delayMs;
  const titleEnd = titleStart + titleIntro.minVisibleMs;
  const fallbackStart = titleEnd + titleIntro.fadeOutMs + artistVisual.gapAfterTitleIntroMs;
  const artistEnd = fallbackStart + artistVisual.visibleMs;

  return { titleStart, titleEnd, fallbackStart, artistEnd };
}

export function getFocusLaneElapsedMs(currentTimeMs: number, bodyFadedAtTrackMs: number | null): number {
  if (bodyFadedAtTrackMs == null) return 0;

  const elapsed = currentTimeMs - bodyFadedAtTrackMs;
  if (elapsed < 0) {
    return getFocusLaneSequenceWindows().fallbackStart;
  }

  return elapsed;
}
