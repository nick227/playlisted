import { playbackFocusTiming } from "@/lib/playbackFocusTiming";
import { getFocusLaneElapsedMs, getFocusLaneSequenceWindows } from "@/lib/playbackFocus/focusLaneSequence";
import type { SubtitleSegment } from "@/lib/subtitles";
import type {
  FocusArtist,
  FocusRecording,
  PlaybackFocusFixture,
  PlaybackFocusState,
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

function canShowFocusLane(focusState: PlaybackFocusState): boolean {
  return focusState.playFocusActive && focusState.hasBodyFaded;
}

function resolveSyntheticFixture(input: {
  focusLaneElapsedMs: number;
  syntheticCues: SyntheticSubtitleCue[];
  artist: FocusArtist | null;
  recording: FocusRecording | null;
}): PlaybackFocusFixture | null {
  const { focusLaneElapsedMs, syntheticCues, artist, recording } = input;

  const titleCue = findActiveSyntheticCue(syntheticCues, focusLaneElapsedMs, "title-intro");
  if (titleCue?.text.trim()) {
    return {
      type: "fallbackSubtitle",
      text: titleCue.text.trim(),
      key: titleCue.id,
      source: titleCue.source,
      artist: artist,
      recording: recording,
    };
  }

  const fallbackCue = findActiveSyntheticCue(syntheticCues, focusLaneElapsedMs);
  if (fallbackCue?.text.trim() && fallbackCue.source !== "title-intro") {
    return {
      type: "fallbackSubtitle",
      text: fallbackCue.text.trim(),
      key: fallbackCue.id,
      source: fallbackCue.source,
      artist: artist,
      recording: recording,
    };
  }

  return null;
}

export function resolvePlaybackFocusFixture(input: ResolvePlaybackFocusInput): PlaybackFocusFixture {
  const {
    currentTimeMs,
    subtitleSegments,
    subtitleReady,
    syntheticCues,
    artist,
    recording,
    focusState,
    subtitlesEnabled,
  } = input;

  if (!canShowFocusLane(focusState)) {
    return { type: "none" };
  }

  const currentTimeSec = currentTimeMs / 1000;

  if (subtitlesEnabled && subtitleReady && subtitleSegments?.length) {
    const activeSegment = findActiveSegment(subtitleSegments, currentTimeSec);
    const text = activeSegment?.text.trim();
    if (text) {
      return {
        type: "subtitle",
        text,
        cueId: `real:${activeSegment?.start ?? 0}-${activeSegment?.end ?? 0}`,
      };
    }
  }

  const focusLaneElapsedMs = getFocusLaneElapsedMs(
    currentTimeMs,
    focusState.bodyFadedAtTrackMs,
  );

  const synthetic = resolveSyntheticFixture({ focusLaneElapsedMs, syntheticCues, artist, recording });
  if (synthetic) {
    return synthetic;
  }

  const { fallbackStart } = getFocusLaneSequenceWindows();

  const title = recording?.title?.trim();
  if (title && focusLaneElapsedMs >= fallbackStart) {
    return {
      type: "finalFallback",
      key: `final-song-title:${recording?.id ?? title}`,
      title,
      artistName: recording?.ownerName?.trim() || null,
      artist: artist,
      recording: recording,
    };
  }

  return { type: "none" };
}

export function getFixtureFadeOutMs(fixture: PlaybackFocusFixture): number {
  if (fixture.type === "none") return 0;
  if (fixture.type === "subtitle") {
    return playbackFocusTiming.focusLane.fadeOutMs + playbackFocusTiming.focusLane.exitBufferMs;
  }
  if (fixture.type === "finalFallback") {
    return playbackFocusTiming.fallbackSubtitle.fadeOutMs;
  }
  if (fixture.type === "fallbackSubtitle" && fixture.source === "title-intro") {
    return playbackFocusTiming.titleIntro.fadeOutMs;
  }
  return playbackFocusTiming.fallbackSubtitle.fadeOutMs;
}

export function getFixtureFadeInMs(fixture: PlaybackFocusFixture): number {
  if (fixture.type === "none") return 0;
  if (fixture.type === "subtitle") return playbackFocusTiming.focusLane.fadeInMs;
  if (fixture.type === "finalFallback") {
    return playbackFocusTiming.fallbackSubtitle.fadeInMs;
  }
  if (fixture.type === "fallbackSubtitle" && fixture.source === "title-intro") {
    return playbackFocusTiming.titleIntro.fadeInMs;
  }
  return playbackFocusTiming.fallbackSubtitle.fadeInMs;
}
