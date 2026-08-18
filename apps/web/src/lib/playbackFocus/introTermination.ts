import type { SubtitleSegment } from "@/lib/subtitles";

export type IntroTerminationInput = {
  subtitlesEnabled: boolean;
  subtitleReady: boolean;
  subtitleSegments: SubtitleSegment[] | null | undefined;
  currentTimeMs: number;
};

/** True once real playback has reached the earliest real lyric cue. */
export function computeIntroTerminatedByLyric(input: IntroTerminationInput): boolean {
  const { subtitlesEnabled, subtitleReady, subtitleSegments, currentTimeMs } = input;
  if (!subtitlesEnabled || !subtitleReady || !subtitleSegments?.length) return false;
  const earliestStartSec = Math.min(...subtitleSegments.map((segment) => segment.start));
  return currentTimeMs / 1000 >= earliestStartSec;
}
