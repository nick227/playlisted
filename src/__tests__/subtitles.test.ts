import { describe, expect, it } from "vitest";

import { srtToSegments } from "../lib/subtitles/srtUtils.js";

describe("subtitle parsing", () => {
  it("parses SRT cues with numeric indexes", () => {
    expect(
      srtToSegments(`1
00:00:01,000 --> 00:00:02,500
hello there

2
00:00:03,000 --> 00:00:04,000
next line`),
    ).toEqual([
      { start: 1, end: 2.5, text: "hello there" },
      { start: 3, end: 4, text: "next line" },
    ]);
  });

  it("parses WebVTT cues without numeric indexes", () => {
    expect(
      srtToSegments(`WEBVTT

00:00:01.000 --> 00:00:02.500
hello there

00:00:03.000 --> 00:00:04.000 align:start position:0%
next line`),
    ).toEqual([
      { start: 1, end: 2.5, text: "hello there" },
      { start: 3, end: 4, text: "next line" },
    ]);
  });
});
