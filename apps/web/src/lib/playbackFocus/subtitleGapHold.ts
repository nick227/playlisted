import type { SubtitleSegment } from "@/lib/subtitles";

export type SubtitleFlowSegment = {
  segment: SubtitleSegment;
  heldThroughGap: boolean;
};

export function resolveSubtitleSegmentAtTime(
  segments: SubtitleSegment[],
  currentTimeSec: number,
  minGapForArtistVisualSec: number,
): SubtitleFlowSegment | null {
  if (!segments.length) return null;

  const sorted = [...segments].sort((left, right) => left.start - right.start);

  const active = sorted.find(
    (segment) => currentTimeSec >= segment.start && currentTimeSec < segment.end,
  );
  if (active) {
    return { segment: active, heldThroughGap: false };
  }

  const nextIndex = sorted.findIndex((segment) => segment.start > currentTimeSec);
  const previous = nextIndex > 0 ? sorted[nextIndex - 1] : undefined;
  const next = nextIndex >= 0 ? sorted[nextIndex] : undefined;

  if (previous && next) {
    const gapSec = next.start - previous.end;
    if (
      gapSec < minGapForArtistVisualSec &&
      currentTimeSec >= previous.end &&
      currentTimeSec < next.start
    ) {
      return { segment: previous, heldThroughGap: true };
    }
    return null;
  }

  return null;
}
