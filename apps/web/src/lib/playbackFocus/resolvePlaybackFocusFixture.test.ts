import { describe, expect, it } from "vitest";

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
  syntheticCues: [],
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

  it("prefers lyrics in the combined resolver when both would apply", () => {
    const fixture = resolvePlaybackFocusFixture(baseInput);
    expect(fixture.type).toBe("subtitle");
  });
});

describe("resolveSubtitleFixture / resolveOverlayFixture", () => {
  it("resolves lyrics and overlay independently so both can apply at once", () => {
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

  it("keeps overlay timing when lyrics are present", () => {
    const overlay = resolveOverlayFixture(baseInput);
    expect(overlay.type).toBe("finalFallback");
  });
});
