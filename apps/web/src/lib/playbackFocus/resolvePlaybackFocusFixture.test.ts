import { describe, expect, it } from "vitest";

import { playbackFocusTiming } from "@/lib/playbackFocusTiming";

import { buildSyntheticSubtitleCues } from "./buildSyntheticCues";
import { getFocusLaneSequenceWindows } from "./focusLaneSequence";
import {
  resolveArtistIntroFixture,
  resolvePlaybackFocusLaneState,
  resolvePlaybackFocusFixture,
  resolveSubtitleFixture,
  resolveTitleIntroFixture,
} from "./resolvePlaybackFocusFixture";
import type { ResolvePlaybackFocusInput } from "./types";

const recording = { id: "rec-1", title: "Song" };

const baseInput: ResolvePlaybackFocusInput = {
  currentTimeMs: 11_000,
  currentEpochMs: 11_000,
  subtitleSegments: [{ start: 10, end: 12, text: "hello" }],
  subtitleReady: true,
  syntheticCues: buildSyntheticSubtitleCues(recording),
  artist: null,
  recording,
  focusState: {
    playFocusActive: true,
    hasBodyFaded: true,
    bodyFadedAtTrackMs: 0,
    titleIntroStartedAtMs: 0,
    titleIntroStartedAtEpochMs: 0,
  },
  subtitlesEnabled: true,
  isPlaying: true,
  introTerminatedByLyric: false,
};

describe("resolvePlaybackFocusFixture", () => {
  it("builds title-intro cues from configured timing", () => {
    const { titleStart, titleEnd, fallbackStart } = getFocusLaneSequenceWindows();

    expect(titleStart).toBe(playbackFocusTiming.titleIntro.delayMs);
    expect(titleEnd - titleStart).toBe(playbackFocusTiming.titleIntro.minVisibleMs);
    expect(fallbackStart - titleEnd).toBe(
      playbackFocusTiming.titleIntro.fadeOutMs + playbackFocusTiming.artistVisual.gapAfterTitleIntroMs,
    );
    expect(baseInput.syntheticCues[0]).toMatchObject({
      startMs: titleStart,
      endMs: titleEnd,
    });
  });

  it("returns none when playback is paused", () => {
    expect(
      resolvePlaybackFocusFixture({
        ...baseInput,
        isPlaying: false,
      }),
    ).toEqual({ type: "none" });
  });

  it("returns none when the body has not faded", () => {
    expect(
      resolvePlaybackFocusFixture({
        ...baseInput,
        focusState: {
          playFocusActive: true,
          hasBodyFaded: false,
          bodyFadedAtTrackMs: null,
          titleIntroStartedAtMs: null,
          titleIntroStartedAtEpochMs: null,
        },
      }),
    ).toEqual({ type: "none" });
  });

  it("prefers title-intro over lyrics while the intro window is active", () => {
    const fixture = resolvePlaybackFocusFixture({
      ...baseInput,
      currentTimeMs: 1_000,
      currentEpochMs: 1_000,
      subtitleSegments: [{ start: 0.5, end: 2, text: "hello" }],
    });
    expect(fixture.type).toBe("titleIntro");
    if (fixture.type === "titleIntro") {
      expect(fixture.title).toBe("Song");
    }
  });

  it("prefers lyrics over ongoing artist overlay after title-intro clears", () => {
    const { fallbackStart } = getFocusLaneSequenceWindows();
    const fixture = resolvePlaybackFocusFixture({
      ...baseInput,
      currentTimeMs: fallbackStart + 200,
      currentEpochMs: fallbackStart + 200,
      introTerminatedByLyric: true,
      subtitleSegments: [
        {
          start: (fallbackStart + 100) / 1000,
          end: (fallbackStart + 800) / 1000,
          text: "hello",
        },
      ],
    });
    expect(fixture.type).toBe("subtitle");
  });
});

describe("resolveSubtitleFixture / resolveArtistIntroFixture", () => {
  it("keeps the initial song card exclusive", () => {
    const input = {
      ...baseInput,
      currentTimeMs: 1_500,
      currentEpochMs: 1_500,
      subtitleSegments: [{ start: 1, end: 3, text: "hello" }],
    };
    expect(resolveSubtitleFixture(input).type).toBe("none");
    const titleIntro = resolveTitleIntroFixture(input);
    expect(titleIntro.type).toBe("titleIntro");
    const artistIntro = resolveArtistIntroFixture(input);
    expect(artistIntro.type).toBe("none");
  });

  it("suppresses lyrics through title-intro fade-out", () => {
    const { titleEnd } = getFocusLaneSequenceWindows();
    // Inside fade-out after titleEnd, before fallbackStart.
    const input = {
      ...baseInput,
      currentTimeMs: titleEnd + 200,
      currentEpochMs: titleEnd + 200,
      subtitleSegments: [{ start: (titleEnd + 100) / 1000, end: (titleEnd + 800) / 1000, text: "hello" }],
    };
    expect(resolveSubtitleFixture(input).type).toBe("none");
  });

  it("suppresses lyrics during the artist-card window when the intro has not been interrupted", () => {
    const { fallbackStart } = getFocusLaneSequenceWindows();
    const input = {
      ...baseInput,
      currentTimeMs: fallbackStart + 200,
      currentEpochMs: fallbackStart + 200,
      subtitleSegments: [
        {
          start: (fallbackStart + 100) / 1000,
          end: (fallbackStart + 800) / 1000,
          text: "hello",
        },
      ],
    };

    expect(resolveSubtitleFixture(input).type).toBe("none");
    const artistIntro = resolveArtistIntroFixture(input);
    expect(artistIntro.type).toBe("artistIntro");
  });

  it("lets a real lyric during the artist-card window terminate the intro", () => {
    const { fallbackStart } = getFocusLaneSequenceWindows();
    const input = {
      ...baseInput,
      currentTimeMs: fallbackStart + 200,
      currentEpochMs: fallbackStart + 200,
      introTerminatedByLyric: true,
      subtitleSegments: [
        {
          start: (fallbackStart + 100) / 1000,
          end: (fallbackStart + 800) / 1000,
          text: "hello",
        },
      ],
    };

    const subtitle = resolveSubtitleFixture(input);
    const artistIntro = resolveArtistIntroFixture(input);

    expect(subtitle).toEqual({
      type: "subtitle",
      text: "hello",
      cueId: `real:${(fallbackStart + 100) / 1000}-${(fallbackStart + 800) / 1000}`,
    });
    expect(artistIntro.type).toBe("none");
  });

  it("shows the artist only during its configured window", () => {
    const { fallbackStart, artistEnd } = getFocusLaneSequenceWindows();
    const artistIntro = resolveArtistIntroFixture({
      ...baseInput,
      currentEpochMs: fallbackStart + 1,
      subtitleSegments: [],
      subtitleReady: false,
    });
    expect(artistIntro.type).toBe("artistIntro");
    expect(resolveArtistIntroFixture({ ...baseInput, currentEpochMs: artistEnd }).type).toBe("none");
  });

  it("uses recording identity in artist-intro fixture keys", () => {
    const { fallbackStart } = getFocusLaneSequenceWindows();
    const first = resolveArtistIntroFixture({ ...baseInput, currentEpochMs: fallbackStart + 1 });
    const second = resolveArtistIntroFixture({
      ...baseInput,
      currentEpochMs: fallbackStart + 1,
      recording: { id: "rec-2", title: "Song" },
    });

    expect(first.type).toBe("artistIntro");
    expect(second.type).toBe("artistIntro");
    if (first.type === "artistIntro" && second.type === "artistIntro") {
      expect(first.key).not.toBe(second.key);
    }
  });
});

describe("resolvePlaybackFocusLaneState", () => {
  it("prioritizes the title card without rendering the artist card", () => {
    const state = resolvePlaybackFocusLaneState({
      ...baseInput,
      currentEpochMs: 1_500,
      currentTimeMs: 1_500,
      subtitleSegments: [{ start: 1, end: 3, text: "hello" }],
    });

    expect(state.activeVariant).toBe("title-intro");
    expect(state.titleIntro.type).toBe("titleIntro");
    expect(state.artistIntro.type).toBe("none");
    expect(state.subtitle.type).toBe("none");
  });

  it("allows the subtitle lane after title-intro fade-out once a lyric terminates the intro", () => {
    const { fallbackStart } = getFocusLaneSequenceWindows();
    const state = resolvePlaybackFocusLaneState({
      ...baseInput,
      currentTimeMs: fallbackStart + 200,
      currentEpochMs: fallbackStart + 200,
      introTerminatedByLyric: true,
      subtitleSegments: [
        {
          start: (fallbackStart + 100) / 1000,
          end: (fallbackStart + 800) / 1000,
          text: "hello",
        },
      ],
    });

    expect(state.activeVariant).toBe("subtitle");
    expect(state.titleIntro.type).toBe("none");
    expect(state.artistIntro.type).toBe("none");
    expect(state.subtitle.type).toBe("subtitle");
  });

  it("keeps the artist card active alongside a not-yet-terminated intro after title-intro fade-out", () => {
    const { fallbackStart } = getFocusLaneSequenceWindows();
    const state = resolvePlaybackFocusLaneState({
      ...baseInput,
      currentTimeMs: fallbackStart + 200,
      currentEpochMs: fallbackStart + 200,
      subtitleSegments: [
        {
          start: (fallbackStart + 100) / 1000,
          end: (fallbackStart + 800) / 1000,
          text: "hello",
        },
      ],
    });

    expect(state.activeVariant).toBe("artist-intro");
    expect(state.titleIntro.type).toBe("none");
    expect(state.artistIntro.type).toBe("artistIntro");
    expect(state.subtitle.type).toBe("none");
  });

  it("keeps title-intro visible for the configured wall-clock duration on an instrumental opening", () => {
    const halfVisible = playbackFocusTiming.titleIntro.delayMs + playbackFocusTiming.titleIntro.minVisibleMs / 2;
    const state = resolvePlaybackFocusLaneState({
      ...baseInput,
      currentTimeMs: 5_000,
      currentEpochMs: halfVisible,
      introTerminatedByLyric: false,
      subtitleSegments: [{ start: 20, end: 21, text: "later lyric" }],
    });

    expect(state.titleIntro.type).toBe("titleIntro");
    expect(state.subtitle.type).toBe("none");
  });

  it("lets a lyric at the halfway point terminate the title-intro card early", () => {
    const halfVisible = playbackFocusTiming.titleIntro.delayMs + playbackFocusTiming.titleIntro.minVisibleMs / 2;
    const state = resolvePlaybackFocusLaneState({
      ...baseInput,
      currentTimeMs: 5_000,
      currentEpochMs: halfVisible,
      introTerminatedByLyric: true,
      subtitleSegments: [{ start: 5, end: 6, text: "halfway lyric" }],
    });

    expect(state.titleIntro.type).toBe("none");
    expect(state.subtitle.type).toBe("subtitle");
  });

  it("moves to the persistent identity card after the five-second artist card, center lane empty", () => {
    const { artistEnd } = getFocusLaneSequenceWindows();
    const state = resolvePlaybackFocusLaneState({
      ...baseInput,
      currentEpochMs: artistEnd,
      currentTimeMs: artistEnd,
    });

    expect(playbackFocusTiming.artistVisual.visibleMs).toBe(5000);
    expect(state.titleIntro.type).toBe("none");
    expect(state.artistIntro.type).toBe("none");
    expect(state.nowPlayingIdentity.type).toBe("nowPlayingIdentity");
  });

  it("never lets the center lane show anything but a subtitle cue or nothing past the intro sequence", () => {
    const { artistEnd } = getFocusLaneSequenceWindows();

    for (const elapsedMs of [artistEnd, artistEnd + 1_000, artistEnd + 60_000]) {
      const state = resolvePlaybackFocusLaneState({
        ...baseInput,
        currentEpochMs: elapsedMs,
        currentTimeMs: elapsedMs,
        introTerminatedByLyric: false,
        subtitleSegments: [],
      });

      expect(state.titleIntro.type).toBe("none");
      expect(state.artistIntro.type).toBe("none");
    }
  });
});
