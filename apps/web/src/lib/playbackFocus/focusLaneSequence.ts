import { playbackFocusTiming } from "@/lib/playbackFocusTiming";

export function getFocusLaneSequenceWindows() {
  const { titleIntro, artistVisual } = playbackFocusTiming;

  const titleStart = titleIntro.delayMs;
  const titleEnd = titleStart + titleIntro.minVisibleMs + titleIntro.fadeOutMs;
  const fallbackStart = titleEnd + artistVisual.gapAfterTitleIntroMs;

  return { titleStart, titleEnd, fallbackStart };
}

export function getFocusLaneElapsedMs(currentTimeMs: number, bodyFadedAtTrackMs: number | null): number {
  if (bodyFadedAtTrackMs == null) return 0;
  return Math.max(0, currentTimeMs - bodyFadedAtTrackMs);
}
