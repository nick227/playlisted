import { describe, expect, it } from "vitest";

import { getFocusLaneSequenceWindows } from "./focusLaneSequence";
import {
  resolveOverlayFixture,
  resolvePlaybackFocusFixture,
  resolveSubtitleFixture,
} from "./resolvePlaybackFocusFixture";
import type { ResolvePlaybackFocusInput } from "./types";

const baseInput: ResolvePlaybackFocusInput = {
  currentTimeMs: 11_000,
  subtitleSegments: [{ start: 10, end: 12, text: "hello" }],
  subtitleReady: true,
  syntheticCues: [
    {
      id: "title-intro",
      source: "title-intro",
      startMs: 0,
      endMs: 3_000,
      text: "Song",
      priority: 20,
    },
  ],
  artist: null,
  recording: { id: "rec-1", title: "Song" },
  focusState: {
    playFocusActive: true,
    hasBodyFaded: true,
    bodyFadedAtTrackMs: 0,
  },
  subtitlesEnabled: true,
  isPlaying: true,
};

describe("resolvePlaybackFocusFixture", () => {
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
        },
      }),
    ).toEqual({ type: "none" });
  });

  it("prefers title-intro over lyrics while the intro window is active", () => {
    const fixture = resolvePlaybackFocusFixture({
      ...baseInput,
      currentTimeMs: 1_000,
      subtitleSegments: [{ start: 0.5, end: 2, text: "hello" }],
    });
    expect(fixture.type).toBe("fallbackSubtitle");
    if (fixture.type === "fallbackSubtitle") {
      expect(fixture.source).toBe("title-intro");
    }
  });

  it("prefers lyrics over ongoing artist overlay after title-intro clears", () => {
    const fixture = resolvePlaybackFocusFixture(baseInput);
    expect(fixture.type).toBe("subtitle");
  });
});

describe("resolveSubtitleFixture / resolveOverlayFixture", () => {
  it("suppresses lyrics while title-intro is active", () => {
    const input = {
      ...baseInput,
      currentTimeMs: 1_500,
      subtitleSegments: [{ start: 1, end: 3, text: "hello" }],
    };
    expect(resolveSubtitleFixture(input).type).toBe("none");
    const overlay = resolveOverlayFixture(input);
    expect(overlay.type).toBe("fallbackSubtitle");
    if (overlay.type === "fallbackSubtitle") {
      expect(overlay.source).toBe("title-intro");
    }
  });

  it("suppresses lyrics through title-intro fade-out", () => {
    const { titleEnd } = getFocusLaneSequenceWindows();
    // Inside fade-out after titleEnd, before fallbackStart.
    const input = {
      ...baseInput,
      currentTimeMs: titleEnd + 200,
      subtitleSegments: [{ start: (titleEnd + 100) / 1000, end: (titleEnd + 800) / 1000, text: "hello" }],
    };
    expect(resolveSubtitleFixture(input).type).toBe("none");
  });

  it("allows lyrics with final artist overlay after title-intro", () => {
    const subtitle = resolveSubtitleFixture(baseInput);
    const overlay = resolveOverlayFixture(baseInput);

    expect(subtitle).toEqual({
      type: "subtitle",
      text: "hello",
      cueId: "real:10-12",
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
});
