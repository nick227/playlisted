import { describe, expect, it } from "vitest";

import { computeIntroTerminatedByLyric } from "./introTermination";

const baseInput = {
  subtitlesEnabled: true,
  subtitleReady: true,
  subtitleSegments: [{ start: 5, end: 6, text: "hello" }],
  currentTimeMs: 0,
};

describe("computeIntroTerminatedByLyric", () => {
  it("is false with no subtitle segments", () => {
    expect(computeIntroTerminatedByLyric({ ...baseInput, subtitleSegments: [] })).toBe(false);
    expect(computeIntroTerminatedByLyric({ ...baseInput, subtitleSegments: null })).toBe(false);
  });

  it("is false when subtitles are not ready", () => {
    expect(
      computeIntroTerminatedByLyric({ ...baseInput, subtitleReady: false, currentTimeMs: 6_000 }),
    ).toBe(false);
  });

  it("is false when subtitles are disabled", () => {
    expect(
      computeIntroTerminatedByLyric({ ...baseInput, subtitlesEnabled: false, currentTimeMs: 6_000 }),
    ).toBe(false);
  });

  it("is false before playback reaches the earliest segment start", () => {
    expect(computeIntroTerminatedByLyric({ ...baseInput, currentTimeMs: 4_000 })).toBe(false);
  });

  it("is true once playback reaches the earliest segment start", () => {
    expect(computeIntroTerminatedByLyric({ ...baseInput, currentTimeMs: 5_000 })).toBe(true);
    expect(computeIntroTerminatedByLyric({ ...baseInput, currentTimeMs: 5_500 })).toBe(true);
  });

  it("uses the true minimum across unsorted segments", () => {
    const segments = [
      { start: 20, end: 21, text: "second" },
      { start: 3, end: 4, text: "first" },
      { start: 12, end: 13, text: "third" },
    ];
    expect(computeIntroTerminatedByLyric({ ...baseInput, subtitleSegments: segments, currentTimeMs: 3_000 })).toBe(
      true,
    );
    expect(computeIntroTerminatedByLyric({ ...baseInput, subtitleSegments: segments, currentTimeMs: 2_999 })).toBe(
      false,
    );
  });
});
