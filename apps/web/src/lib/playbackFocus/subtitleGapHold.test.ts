import { describe, expect, it } from "vitest";

import type { SubtitleSegment } from "@/lib/subtitles";

import { resolveSubtitleSegmentAtTime } from "./subtitleGapHold";

const segments: SubtitleSegment[] = [
  { start: 10, end: 12, text: "first line" },
  { start: 12.05, end: 14, text: "second line" },
  { start: 20, end: 22, text: "after silence" },
];

describe("resolveSubtitleSegmentAtTime", () => {
  it("returns the active segment during its window", () => {
    const result = resolveSubtitleSegmentAtTime(segments, 11, 2);
    expect(result).toEqual({ segment: segments[0], heldThroughGap: false });
  });

  it("holds the previous segment through a micro-gap", () => {
    const result = resolveSubtitleSegmentAtTime(segments, 12.02, 2);
    expect(result).toEqual({ segment: segments[0], heldThroughGap: true });
  });

  it("allows artist visual during a long silence between subtitles", () => {
    expect(resolveSubtitleSegmentAtTime(segments, 16, 2)).toBeNull();
  });

  it("allows artist visual before the first subtitle", () => {
    expect(resolveSubtitleSegmentAtTime(segments, 2, 2)).toBeNull();
  });

  it("allows artist visual after the last subtitle", () => {
    expect(resolveSubtitleSegmentAtTime(segments, 25, 2)).toBeNull();
  });
});
