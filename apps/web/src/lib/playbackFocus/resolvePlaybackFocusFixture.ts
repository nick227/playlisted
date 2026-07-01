import { playbackFocusTiming } from "@/lib/playbackFocusTiming";
import type { SubtitleSegment } from "@/lib/subtitles";
import type {
  PlaybackFocusFixture,
  ResolvePlaybackFocusInput,
  SyntheticSubtitleCue,
} from "@/lib/playbackFocus/types";

function findActiveSegment(
  segments: SubtitleSegment[],
  currentTimeSec: number,
): SubtitleSegment | undefined {
  return segments.find(
    (segment) => currentTimeSec >= segment.start && currentTimeSec < segment.end,
  );
}

function findActiveSyntheticCue(
  cues: SyntheticSubtitleCue[],
  currentTimeMs: number,
  source?: SyntheticSubtitleCue["source"],
): SyntheticSubtitleCue | undefined {
  return cues
    .filter((cue) => (source ? cue.source === source : true))
    .filter((cue) => currentTimeMs >= cue.startMs && currentTimeMs < cue.endMs)
    .sort((left, right) => right.priority - left.priority)[0];
}

function canShowPostBodyFixture(focusState: ResolvePlaybackFocusInput["focusState"]): boolean {
  return focusState.playFocusActive && focusState.hasBodyFaded;
}

export function resolvePlaybackFocusFixture(input: ResolvePlaybackFocusInput): PlaybackFocusFixture {
  const {
    currentTimeMs,
    subtitleSegments,
    subtitleReady,
    syntheticCues,
    artist,
    focusState,
    subtitlesEnabled,
  } = input;

  if (!focusState.playFocusActive || !subtitlesEnabled) {
    return { type: "none" };
  }

  const currentTimeSec = currentTimeMs / 1000;

  if (subtitleReady && subtitleSegments?.length) {
    const activeSegment = findActiveSegment(subtitleSegments, currentTimeSec);
    const text = activeSegment?.text.trim();
    if (text && canShowPostBodyFixture(focusState)) {
      return {
        type: "subtitle",
        text,
        cueId: `real:${activeSegment?.start ?? 0}-${activeSegment?.end ?? 0}`,
      };
    }
  }

  const titleCue = findActiveSyntheticCue(syntheticCues, currentTimeMs, "title-intro");
  if (titleCue?.text.trim() && canShowPostBodyFixture(focusState)) {
    return {
      type: "fallbackSubtitle",
      text: titleCue.text.trim(),
      key: titleCue.id,
      source: titleCue.source,
    };
  }

  if (
    canShowPostBodyFixture(focusState) &&
    currentTimeMs >= playbackFocusTiming.artistVisual.delayMs &&
    currentTimeMs <
      playbackFocusTiming.artistVisual.delayMs + playbackFocusTiming.fallbackSubtitle.maxVisibleMs &&
    artist?.artistName
  ) {
    return {
      type: "artistVisual",
      artistName: artist.artistName,
      imageUrl: artist.imageUrl ?? undefined,
      bioLine: artist.bioLine ?? undefined,
    };
  }

  if (canShowPostBodyFixture(focusState)) {
    const fallbackCue = findActiveSyntheticCue(syntheticCues, currentTimeMs);
    if (fallbackCue?.text.trim() && fallbackCue.source !== "title-intro") {
      return {
        type: "fallbackSubtitle",
        text: fallbackCue.text.trim(),
        key: fallbackCue.id,
        source: fallbackCue.source,
      };
    }
  }

  return { type: "none" };
}

export function getFixtureFadeOutMs(fixture: PlaybackFocusFixture): number {
  if (fixture.type === "none") return 0;
  if (fixture.type === "subtitle") {
    return playbackFocusTiming.focusLane.fadeOutMs + playbackFocusTiming.focusLane.exitBufferMs;
  }
  if (fixture.type === "artistVisual") {
    return playbackFocusTiming.artistVisual.fadeOutMs;
  }
  if (fixture.source === "title-intro") {
    return playbackFocusTiming.titleIntro.fadeOutMs;
  }
  return playbackFocusTiming.fallbackSubtitle.fadeOutMs;
}

export function getFixtureFadeInMs(fixture: PlaybackFocusFixture): number {
  if (fixture.type === "none") return 0;
  if (fixture.type === "subtitle") return playbackFocusTiming.focusLane.fadeInMs;
  if (fixture.type === "artistVisual") return playbackFocusTiming.artistVisual.fadeInMs;
  if (fixture.type === "fallbackSubtitle" && fixture.source === "title-intro") {
    return playbackFocusTiming.titleIntro.fadeInMs;
  }
  return playbackFocusTiming.fallbackSubtitle.fadeInMs;
}
