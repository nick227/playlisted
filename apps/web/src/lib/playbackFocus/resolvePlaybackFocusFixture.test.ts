import { describe, expect, it } from "vitest";

import { resolvePlaybackFocusFixture } from "./resolvePlaybackFocusFixture";
import type { ResolvePlaybackFocusInput } from "./types";

const baseInput: ResolvePlaybackFocusInput = {
  currentTimeMs: 12_000,
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
});
