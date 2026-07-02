import { describe, expect, it } from "vitest";

import type { SongVisualAttachmentRecord } from "@/lib/visualMediaApi";

import {
  collectSnapTargets,
  resolveSnapThresholdSec,
  snapClipMoveStart,
  snapClipResizeEnd,
  snapClipResizeStart,
  snapTimeSec,
} from "./timelineSnap";
import type { TimelineClip } from "./types";

function clip(id: string, startSec: number, durationSec: number): TimelineClip {
  return {
    attachment: { id } as SongVisualAttachmentRecord,
    startSec,
    endSec: startSec + durationSec,
    durationSec,
    loop: true,
    naturalDurationSec: durationSec,
  };
}

describe("timelineSnap", () => {
  it("clamps threshold between 0.15s and 0.25s", () => {
    expect(resolveSnapThresholdSec(120, 10_000)).toBe(0.15);
    expect(resolveSnapThresholdSec(120, 100)).toBe(0.25);
  });

  it("snaps to the nearest guide within threshold", () => {
    const targets = [
      { timeSec: 0, kind: "song-start" as const },
      { timeSec: 10, kind: "clip-edge" as const },
    ];
    const snap = snapTimeSec(9.88, targets, 0.2);
    expect(snap.snapped).toBe(true);
    expect(snap.timeSec).toBe(10);
    expect(snap.guide?.kind).toBe("clip-edge");
  });

  it("collects song bounds, playhead, and other clip edges", () => {
    const targets = collectSnapTargets({
      songDurationSec: 60,
      playheadSec: 12,
      clips: [clip("a", 5, 8), clip("b", 20, 4)],
      excludeAttachmentId: "a",
    });
    const times = targets.map((target) => target.timeSec);
    expect(times).toContain(0);
    expect(times).toContain(60);
    expect(times).toContain(12);
    expect(times).toContain(20);
    expect(times).toContain(24);
    expect(times).not.toContain(5);
    expect(times).not.toContain(13);
  });

  it("snaps move to clip start when start edge is closer", () => {
    const targets = collectSnapTargets({
      songDurationSec: 60,
      playheadSec: 30,
      clips: [clip("other", 20, 6)],
      excludeAttachmentId: "self",
    });
    const result = snapClipMoveStart(19.9, 4, targets, 0.2);
    expect(result.startSec).toBe(20);
    expect(result.guide?.kind).toBe("clip-edge");
  });

  it("snaps move to clip end when end edge is closer", () => {
    const targets = collectSnapTargets({
      songDurationSec: 60,
      playheadSec: 30,
      clips: [clip("other", 20, 6)],
      excludeAttachmentId: "self",
    });
    const result = snapClipMoveStart(22.1, 4, targets, 0.2);
    expect(result.startSec).toBe(22);
    expect(result.guide?.kind).toBe("clip-edge");
  });

  it("snaps resize start and end independently", () => {
    const targets = collectSnapTargets({
      songDurationSec: 60,
      playheadSec: 15,
      clips: [],
      excludeAttachmentId: "self",
    });
    expect(snapClipResizeStart(0.12, targets, 0.2).startSec).toBe(0);
    expect(snapClipResizeEnd(59.9, targets, 0.2).endSec).toBe(60);
  });
});
