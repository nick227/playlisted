import { describe, expect, it } from "vitest";

import { buildSongVisualMediaResponse, mapSongVisualAttachment } from "../lib/visualMedia/mapDto.js";
import { prismaPolicyToTheatre, theatrePolicyToPrisma } from "../lib/visualMedia/types.js";

describe("visual media dto mapping", () => {
  it("maps prisma policy enums to theatre policy strings", () => {
    expect(prismaPolicyToTheatre("PREFER_ATTACHED")).toBe("preferAttached");
    expect(prismaPolicyToTheatre("ATTACHED_ONLY")).toBe("attachedOnly");
    expect(theatrePolicyToPrisma("mixAttachedAndDefault")).toBe("MIX_ATTACHED_AND_DEFAULT");
  });

  it("builds song visual response with enabled attachments only in theatre resolution path", () => {
    const response = buildSongVisualMediaResponse("rec-1", [
      {
        id: "att-1",
        recordingId: "rec-1",
        mediaAssetId: "asset-1",
        policy: "PREFER_ATTACHED",
        weight: 2,
        sortOrder: 0,
        label: "Loop A",
        playbackJson: { loop: true, muted: true, objectFit: "cover" },
        rotationJson: null,
        beatFxJson: { enabled: true, intensity: "subtle", effects: ["scale"] },
        tagsJson: ["user-media"],
        enabled: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        mediaAsset: {
          id: "asset-1",
          ownerId: "user-1",
          mediaType: "VIDEO",
          storageKey: "videos/demo.mp4",
          url: "/uploads/videos/demo.mp4",
          thumbnailUrl: null,
          originalName: "demo.mp4",
          mimeType: "video/mp4",
          sizeBytes: 1024,
          durationMs: null,
          width: null,
          height: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      },
    ]);

    expect(response.policy).toBe("preferAttached");
    expect(response.attachments).toHaveLength(1);
    expect(response.attachments[0]?.mediaAsset.mediaType).toBe("video");
    expect(response.attachments[0]?.playback?.loop).toBe(true);
  });

  it("maps attachment dto with beatFx json", () => {
    const dto = mapSongVisualAttachment({
      id: "att-2",
      recordingId: "rec-2",
      mediaAssetId: "asset-2",
      policy: "ATTACHED_ONLY",
      weight: 1,
      sortOrder: 1,
      label: null,
      playbackJson: null,
      rotationJson: null,
      beatFxJson: { enabled: true, effects: ["brightness"] },
      tagsJson: null,
      enabled: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      mediaAsset: {
        id: "asset-2",
        ownerId: "user-1",
        mediaType: "IMAGE",
        storageKey: null,
        url: "/uploads/images/still.jpg",
        thumbnailUrl: "/uploads/images/still.jpg",
        originalName: "still.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 512,
        durationMs: null,
        width: 800,
        height: 800,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    }, "rec-2");

    expect(dto.policy).toBe("attachedOnly");
    expect(dto.beatFx?.enabled).toBe(true);
  });
});
