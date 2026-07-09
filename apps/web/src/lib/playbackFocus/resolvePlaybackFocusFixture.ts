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

export type PlaybackFocusVariant = "title-intro" | "artist-visual" | "subtitle" | null;

export type PlaybackFocusLaneState = {
  titleIntro: PlaybackFocusFixture;
  overlay: PlaybackFocusFixture;
  subtitle: PlaybackFocusFixture;
  activeVariant: PlaybackFocusVariant;
};

function findActiveSyntheticCue(
  cues: SyntheticSubtitleCue[],
  currentTimeMs: number,
  source: SyntheticSubtitleCue["source"],
): SyntheticSubtitleCue | undefined {
  return cues
    .filter((cue) => cue.source === source)
    .filter((cue) => currentTimeMs >= cue.startMs && currentTimeMs < cue.endMs)
    .sort((left, right) => right.priority - left.priority)[0];
}

function canShowFocusLane(focusState: PlaybackFocusState): boolean {
  return focusState.playFocusActive && focusState.hasBodyFaded;
}

/** Title-intro window including fade-out — lyrics must stay dark for the whole span. */
export function isTitleIntroWindowActive(focusLaneElapsedMs: number): boolean {
  const { titleStart, fallbackStart } = getFocusLaneSequenceWindows();
  return focusLaneElapsedMs >= titleStart && focusLaneElapsedMs < fallbackStart;
}

function resolveTitleIntroSyntheticFixture(input: {
  focusLaneElapsedMs: number;
  syntheticCues: SyntheticSubtitleCue[];
  artist: FocusArtist | null;
  recording: FocusRecording | null;
}): PlaybackFocusFixture | null {
  const { focusLaneElapsedMs, syntheticCues, artist, recording } = input;

  const titleCue = findActiveSyntheticCue(syntheticCues, focusLaneElapsedMs, "title-intro");
  if (titleCue?.text.trim()) {
    return {
      type: "titleIntro",
      title: titleCue.text.trim(),
      key: titleCue.id,
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
    currentEpochMs,
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
    currentEpochMs,
    focusState.titleIntroStartedAtEpochMs,
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
 * Chromeless title intro overlay.
 */
export function resolveTitleIntroFixture(input: ResolvePlaybackFocusInput): PlaybackFocusFixture {
  const { currentEpochMs, syntheticCues, artist, recording, focusState, isPlaying } = input;

  if (!canShowFocusLane(focusState) || !isPlaying) {
    return { type: "none" };
  }

  const focusLaneElapsedMs = getFocusLaneElapsedMs(
    currentEpochMs,
    focusState.titleIntroStartedAtEpochMs,
  );

  const synthetic = resolveTitleIntroSyntheticFixture({
    focusLaneElapsedMs,
    syntheticCues,
    artist,
    recording,
  });
  if (synthetic?.type === "titleIntro") {
    return synthetic;
  }

  return { type: "none" };
}

/**
 * Chromeless title/artist overlay windows based on focus-lane elapsed time.
 * Independent of lyric subtitles except during title-intro exclusivity above.
 */
export function resolveOverlayFixture(input: ResolvePlaybackFocusInput): PlaybackFocusFixture {
  const { artist, recording, focusState, isPlaying } = input;

  if (!canShowFocusLane(focusState) || !isPlaying) {
    return { type: "none" };
  }

  const title = recording?.title?.trim();
  if (title) {
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

export function resolvePlaybackFocusFixture(input: ResolvePlaybackFocusInput): PlaybackFocusFixture {
  const titleIntro = resolveTitleIntroFixture(input);
  if (titleIntro.type !== "none") return titleIntro;

  const subtitle = resolveSubtitleFixture(input);
  if (subtitle.type !== "none") return subtitle;
  
  return resolveOverlayFixture(input);
}

export function resolvePlaybackFocusLaneState(input: ResolvePlaybackFocusInput): PlaybackFocusLaneState {
  const titleIntro = resolveTitleIntroFixture(input);
  const overlay = resolveOverlayFixture(input);
  const subtitle: PlaybackFocusFixture =
    titleIntro.type !== "none" ? { type: "none" } : resolveSubtitleFixture(input);

  const activeVariant: PlaybackFocusVariant =
    titleIntro.type !== "none"
      ? "title-intro"
      : subtitle.type !== "none"
        ? "subtitle"
        : overlay.type !== "none"
          ? "artist-visual"
          : null;

  return {
    titleIntro,
    overlay,
    subtitle,
    activeVariant,
  };
}

export function getFixtureFadeOutMs(fixture: PlaybackFocusFixture): number {
  if (fixture.type === "none") return 0;
  if (fixture.type === "subtitle") {
    return playbackFocusTiming.focusLane.fadeOutMs + playbackFocusTiming.focusLane.exitBufferMs;
  }
  if (fixture.type === "finalFallback") {
    return playbackFocusTiming.finalFallback.fadeOutMs;
  }
  if (fixture.type === "titleIntro") {
    return playbackFocusTiming.titleIntro.fadeOutMs;
  }
  return playbackFocusTiming.finalFallback.fadeOutMs;
}
