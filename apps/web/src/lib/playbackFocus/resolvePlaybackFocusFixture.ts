import { playbackFocusTiming } from "@/lib/playbackFocusTiming";
import { getFocusLaneElapsedMs, getFocusLaneSequenceWindows } from "@/lib/playbackFocus/focusLaneSequence";
import { resolveSubtitleSegmentAtTime } from "@/lib/playbackFocus/subtitleGapHold";
import type {
  FocusArtist,
  FocusRecording,
  PlaybackFocusFixture,
  PlaybackFocusState,
  ResolvePlaybackFocusInput,
  SyntheticSubtitleCue,
} from "@/lib/playbackFocus/types";

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

/** Title-intro window including fade-out — lyrics must stay dark for the whole span. */
export function isTitleIntroWindowActive(focusLaneElapsedMs: number): boolean {
  const { titleStart, titleEnd } = getFocusLaneSequenceWindows();
  const titleClearMs = titleEnd + playbackFocusTiming.titleIntro.fadeOutMs;
  return focusLaneElapsedMs >= titleStart && focusLaneElapsedMs < titleClearMs;
}

export function isTitleIntroFixture(fixture: PlaybackFocusFixture | null | undefined): boolean {
  return fixture?.type === "fallbackSubtitle" && fixture.source === "title-intro";
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

/**
 * Lyric captions — blocked during title-intro (incl. fade-out) so center card and
 * captions never share the viewport. Ongoing artist overlay can still coexist.
 */
export function resolveSubtitleFixture(input: ResolvePlaybackFocusInput): PlaybackFocusFixture {
  const {
    currentTimeMs,
    subtitleSegments,
    subtitleReady,
    focusState,
    subtitlesEnabled,
    isPlaying,
  } = input;

  if (!canShowFocusLane(focusState) || !isPlaying) {
    return { type: "none" };
  }

  const focusLaneElapsedMs = getFocusLaneElapsedMs(
    currentTimeMs,
    focusState.bodyFadedAtTrackMs,
  );
  if (isTitleIntroWindowActive(focusLaneElapsedMs)) {
    return { type: "none" };
  }

  if (!(subtitlesEnabled && subtitleReady && subtitleSegments?.length)) {
    return { type: "none" };
  }

  const currentTimeSec = currentTimeMs / 1000;
  const flowSegment = resolveSubtitleSegmentAtTime(
    subtitleSegments,
    currentTimeSec,
    playbackFocusTiming.subtitleFlow.minGapForArtistVisualMs / 1000,
  );
  if (!flowSegment) {
    return { type: "none" };
  }

  const text = flowSegment.segment.text.trim();
  if (!text) {
    return { type: "none" };
  }

  return {
    type: "subtitle",
    text,
    cueId: `real:${flowSegment.segment.start}-${flowSegment.segment.end}`,
  };
}

/**
 * Chromeless title/artist overlay windows based on focus-lane elapsed time.
 * Independent of lyric subtitles except during title-intro exclusivity above.
 */
export function resolveOverlayFixture(input: ResolvePlaybackFocusInput): PlaybackFocusFixture {
  const { currentTimeMs, syntheticCues, artist, recording, focusState, isPlaying } = input;

  if (!canShowFocusLane(focusState) || !isPlaying) {
    return { type: "none" };
  }

  const focusLaneElapsedMs = getFocusLaneElapsedMs(
    currentTimeMs,
    focusState.bodyFadedAtTrackMs,
  );

  const synthetic = resolveSyntheticFixture({
    focusLaneElapsedMs,
    syntheticCues,
    artist,
    recording,
  });
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

/** Combined resolver: title-intro beats lyrics; otherwise lyrics beat ongoing overlay. */
export function resolvePlaybackFocusFixture(input: ResolvePlaybackFocusInput): PlaybackFocusFixture {
  const overlay = resolveOverlayFixture(input);
  if (isTitleIntroFixture(overlay)) return overlay;

  const subtitle = resolveSubtitleFixture(input);
  if (subtitle.type !== "none") return subtitle;
  return overlay;
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
