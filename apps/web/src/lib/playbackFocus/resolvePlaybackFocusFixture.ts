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

export type PlaybackFocusVariant = "title-intro" | "artist-intro" | "now-playing-identity" | "subtitle" | null;

export type PlaybackFocusLaneState = {
  titleIntro: PlaybackFocusFixture;
  artistIntro: PlaybackFocusFixture;
  nowPlayingIdentity: PlaybackFocusFixture;
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

/**
 * Full intro-sequence window (title card + artist card) — lyrics stay dark
 * for the whole span unless a real lyric terminates the intro early.
 */
export function isIntroSequenceWindowActive(focusLaneElapsedMs: number): boolean {
  const { titleStart, artistEnd } = getFocusLaneSequenceWindows();
  return focusLaneElapsedMs >= titleStart && focusLaneElapsedMs < artistEnd;
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
 * Lyric captions — blocked for the whole intro sequence (title card + artist
 * card) unless a real lyric has already cut the intro short.
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
    introTerminatedByLyric,
  } = input;

  if (!canShowFocusLane(focusState) || !isPlaying) {
    return { type: "none" };
  }

  const focusLaneElapsedMs = getFocusLaneElapsedMs(
    currentEpochMs,
    focusState.titleIntroStartedAtEpochMs,
  );

  if (!introTerminatedByLyric && isIntroSequenceWindowActive(focusLaneElapsedMs)) {
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
 * Chromeless title intro overlay (phase 1).
 */
export function resolveTitleIntroFixture(input: ResolvePlaybackFocusInput): PlaybackFocusFixture {
  const { currentEpochMs, syntheticCues, artist, recording, focusState, isPlaying, introTerminatedByLyric } = input;

  if (!canShowFocusLane(focusState) || !isPlaying || introTerminatedByLyric) {
    return { type: "none" };
  }

  const focusLaneElapsedMs = getFocusLaneElapsedMs(
    currentEpochMs,
    focusState.titleIntroStartedAtEpochMs,
  );

  return (
    resolveTitleIntroSyntheticFixture({
      focusLaneElapsedMs,
      syntheticCues,
      artist,
      recording,
    }) ?? { type: "none" }
  );
}

/**
 * Chromeless artist overlay (phase 2) — brief artist-name/art card following
 * the title-intro card.
 */
export function resolveArtistIntroFixture(input: ResolvePlaybackFocusInput): PlaybackFocusFixture {
  const { artist, recording, focusState, isPlaying, currentEpochMs, introTerminatedByLyric } = input;

  if (!canShowFocusLane(focusState) || !isPlaying || introTerminatedByLyric) {
    return { type: "none" };
  }

  const elapsedMs = getFocusLaneElapsedMs(currentEpochMs, focusState.titleIntroStartedAtEpochMs);
  const { fallbackStart, artistEnd } = getFocusLaneSequenceWindows();
  const title = recording?.title?.trim();
  if (title && elapsedMs >= fallbackStart && elapsedMs < artistEnd) {
    return {
      type: "artistIntro",
      key: `artist-intro:${recording?.id ?? title}`,
      title,
      artistName: recording?.ownerName?.trim() || null,
      artist: artist,
      recording: recording,
    };
  }

  return { type: "none" };
}

/**
 * Persistent, bottom-left identity card — active once the intro sequence has
 * finished naturally or been cut short by a real lyric. Independent of
 * lyric subtitles: different screen space, so the two can coexist.
 */
export function resolveNowPlayingIdentityFixture(input: ResolvePlaybackFocusInput): PlaybackFocusFixture {
  const { currentEpochMs, recording, artist, focusState, isPlaying, introTerminatedByLyric } = input;

  if (!canShowFocusLane(focusState) || !isPlaying) {
    return { type: "none" };
  }

  const elapsedMs = getFocusLaneElapsedMs(currentEpochMs, focusState.titleIntroStartedAtEpochMs);
  const { artistEnd } = getFocusLaneSequenceWindows();
  const title = recording?.title?.trim();
  if (title && (elapsedMs >= artistEnd || introTerminatedByLyric)) {
    return {
      type: "nowPlayingIdentity",
      key: `now-playing:${recording?.id ?? title}`,
      title,
      artist,
      recording,
    };
  }

  return { type: "none" };
}

export function resolvePlaybackFocusFixture(input: ResolvePlaybackFocusInput): PlaybackFocusFixture {
  const titleIntro = resolveTitleIntroFixture(input);
  if (titleIntro.type !== "none") return titleIntro;

  const artistIntro = resolveArtistIntroFixture(input);
  if (artistIntro.type !== "none") return artistIntro;

  const subtitle = resolveSubtitleFixture(input);
  if (subtitle.type !== "none") return subtitle;

  return resolveNowPlayingIdentityFixture(input);
}

export function resolvePlaybackFocusLaneState(input: ResolvePlaybackFocusInput): PlaybackFocusLaneState {
  const titleIntro = resolveTitleIntroFixture(input);
  // Title and artist intro cards are mutually exclusive.
  const artistIntro = titleIntro.type === "none" ? resolveArtistIntroFixture(input) : { type: "none" as const };
  const introActive = titleIntro.type !== "none" || artistIntro.type !== "none";
  const subtitle: PlaybackFocusFixture = introActive ? { type: "none" } : resolveSubtitleFixture(input);
  // Persistent identity lives bottom-left and never competes with subtitles for center stage.
  const nowPlayingIdentity = resolveNowPlayingIdentityFixture(input);

  const activeVariant: PlaybackFocusVariant =
    titleIntro.type !== "none"
      ? "title-intro"
      : artistIntro.type !== "none"
        ? "artist-intro"
        : subtitle.type !== "none"
          ? "subtitle"
          : nowPlayingIdentity.type !== "none"
            ? "now-playing-identity"
            : null;

  return {
    titleIntro,
    artistIntro,
    nowPlayingIdentity,
    subtitle,
    activeVariant,
  };
}

export function getFixtureFadeOutMs(fixture: PlaybackFocusFixture): number {
  switch (fixture.type) {
    case "none":
      return 0;
    case "subtitle":
      return playbackFocusTiming.focusLane.fadeOutMs + playbackFocusTiming.focusLane.exitBufferMs;
    case "titleIntro":
      return playbackFocusTiming.titleIntro.fadeOutMs;
    case "artistIntro":
      return playbackFocusTiming.finalFallback.fadeOutMs;
    case "nowPlayingIdentity":
      return playbackFocusTiming.artistVisual.fadeOutMs;
    default: {
      const _exhaustive: never = fixture;
      return _exhaustive;
    }
  }
}
