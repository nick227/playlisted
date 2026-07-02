import { describe, expect, it, vi } from "vitest";

import type { SongVisualAttachmentRecord } from "@/lib/visualMediaApi";

import { clipToVisualMediaAttachment } from "./clipToVisualMediaAttachment";
import type { TimelineClip } from "../types";

function makeClip(overrides: Partial<TimelineClip> = {}): TimelineClip {
  const attachment: SongVisualAttachmentRecord = {
    id: "clip-1",
    songId: "song-1",
    recordingId: "rec-1",
    mediaAssetId: "asset-1",
    policy: "preferAttached",
    weight: 1,
    order: 0,
    label: "Clip",
    enabled: true,
    playback: {
      loop: true,
      timelineStartSec: 12,
      timelineDurationSec: 8,
      startOffsetMs: 500,
      muted: true,
      objectFit: "cover",
    },
    rotation: null,
    beatFx: { enabled: true, intensity: "subtle", effects: ["scale", "brightness"] },
    tags: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    mediaAsset: {
      id: "asset-1",
      ownerId: "user-1",
      mediaType: "image",
      url: "/uploads/photo.jpg",
      thumbnailUrl: "/uploads/photo-thumb.jpg",
      originalName: "photo.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1000,
      durationMs: null,
      width: 1920,
      height: 1080,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  };

  return {
    attachment,
    startSec: 12,
    endSec: 20,
    durationSec: 8,
    loop: true,
    naturalDurationSec: 8,
    ...overrides,
  };
}

describe("clipToVisualMediaAttachment", () => {
  it("maps timeline clip layout and beatFx into theatre attachments", () => {
    vi.stubGlobal("window", { location: { origin: "http://localhost" } });
    const mapped = clipToVisualMediaAttachment(makeClip());

    expect(mapped.id).toBe("clip-1");
    expect(mapped.mediaType).toBe("image");
    expect(mapped.url).toContain("/uploads/photo.jpg");
    expect(mapped.playback?.timelineStartSec).toBe(12);
    expect(mapped.playback?.timelineDurationSec).toBe(8);
    expect(mapped.beatFx?.enabled).toBe(true);
  });
});
