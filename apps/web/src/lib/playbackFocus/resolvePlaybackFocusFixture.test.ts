import { describe, expect, it } from "vitest";

import { playbackFocusTiming } from "@/lib/playbackFocusTiming";

import { buildSyntheticSubtitleCues } from "./buildSyntheticCues";
import { getFocusLaneSequenceWindows } from "./focusLaneSequence";
import {
  resolveOverlayFixture,
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

describe("resolveSubtitleFixture / resolveOverlayFixture", () => {
  it("keeps title-intro separate from the persistent overlay", () => {
    const input = {
      ...baseInput,
      currentTimeMs: 1_500,
      currentEpochMs: 1_500,
      subtitleSegments: [{ start: 1, end: 3, text: "hello" }],
    };
    expect(resolveSubtitleFixture(input).type).toBe("none");
    const titleIntro = resolveTitleIntroFixture(input);
    expect(titleIntro.type).toBe("titleIntro");
    const overlay = resolveOverlayFixture(input);
    expect(overlay.type).toBe("finalFallback");
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

  it("allows lyrics with final artist overlay after title-intro", () => {
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
    const subtitle = resolveSubtitleFixture(input);
    const overlay = resolveOverlayFixture(input);

    expect(subtitle).toEqual({
      type: "subtitle",
      text: "hello",
      cueId: `real:${(fallbackStart + 100) / 1000}-${(fallbackStart + 800) / 1000}`,
    });
    expect(overlay.type).toBe("finalFallback");
  });

  it("keeps overlay timing when lyrics are absent", () => {
    const overlay = resolveOverlayFixture({
      ...baseInput,
      subtitleSegments: [],
      subtitleReady: false,
    });
    expect(overlay.type).toBe("finalFallback");
  });

  it("uses recording identity in final overlay fixture keys", () => {
    const first = resolveOverlayFixture(baseInput);
    const second = resolveOverlayFixture({
      ...baseInput,
      recording: { id: "rec-2", title: "Song" },
    });

    expect(first.type).toBe("finalFallback");
    expect(second.type).toBe("finalFallback");
    if (first.type === "finalFallback" && second.type === "finalFallback") {
      expect(first.key).not.toBe(second.key);
    }
  });
});

describe("resolvePlaybackFocusLaneState", () => {
  it("prioritizes title-intro variant while allowing the overlay lane to coexist", () => {
    const state = resolvePlaybackFocusLaneState({
      ...baseInput,
      currentEpochMs: 1_500,
      currentTimeMs: 1_500,
      subtitleSegments: [{ start: 1, end: 3, text: "hello" }],
    });

    expect(state.activeVariant).toBe("title-intro");
    expect(state.titleIntro.type).toBe("titleIntro");
    expect(state.overlay.type).toBe("finalFallback");
    expect(state.subtitle.type).toBe("none");
  });

  it("allows subtitle and overlay lanes after title-intro fade-out", () => {
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

    expect(state.activeVariant).toBe("subtitle");
    expect(state.titleIntro.type).toBe("none");
    expect(state.overlay.type).toBe("finalFallback");
    expect(state.subtitle.type).toBe("subtitle");
  });

  it("keeps title-intro visible for the configured wall-clock duration even when track time is already advanced", () => {
    const halfVisible = playbackFocusTiming.titleIntro.delayMs + playbackFocusTiming.titleIntro.minVisibleMs / 2;
    const state = resolvePlaybackFocusLaneState({
      ...baseInput,
      currentTimeMs: 5_000,
      currentEpochMs: halfVisible,
      subtitleSegments: [{ start: 5, end: 6, text: "halfway lyric" }],
    });

    expect(state.titleIntro.type).toBe("titleIntro");
    expect(state.subtitle.type).toBe("none");
  });
});
