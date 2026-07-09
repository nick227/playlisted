import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import type { SongVisualAttachmentRecord, SongVisualMediaRecord } from "@/lib/visualMediaApi";

import {
  applyBeatFxPatch,
  applyClipBoundsPatch,
  applyPolicyPatch,
  reconcileAttachmentInCache,
  removeAttachmentFromCache,
  restoreAttachmentInCache,
  songVisualQueryKey,
} from "./optimisticSongVisualCache";

function makeAttachment(id: string, order: number): SongVisualAttachmentRecord {
  return {
    id,
    songId: "song-1",
    recordingId: "rec-1",
    mediaAssetId: `asset-${id}`,
    policy: "preferAttached",
    weight: 1,
    order,
    label: `Clip ${id}`,
    enabled: true,
    playback: {
      loop: true,
      timelineStartSec: order * 10,
      timelineDurationSec: 8,
      startOffsetMs: 0,
      muted: true,
      objectFit: "cover",
    },
    rotation: null,
    beatFx: null,
    tags: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    mediaAsset: {
      id: `asset-${id}`,
      ownerId: "user-1",
      mediaType: "video" as const,
      url: `/uploads/user/video-${id}.mp4`,
      thumbnailUrl: null,
      originalName: `video-${id}.mp4`,
      mimeType: "video/mp4",
      sizeBytes: 1000,
      width: 1920,
      height: 1080,
      durationMs: 8000,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  };
}

function seedCache(queryClient: QueryClient, recordingId: string, attachments: SongVisualAttachmentRecord[]) {
	  const data: SongVisualMediaRecord = {
	    songId: "song-1",
	    recordingId,
	    policy: "preferAttached",
	    atmosphereFx: null,
	    attachments,
	  };
  queryClient.setQueryData(songVisualQueryKey(recordingId), data);
  return data;
}

describe("optimisticSongVisualCache", () => {
  it("applies clip bounds optimistically", () => {
    const queryClient = new QueryClient();
    const recordingId = "rec-1";
    const attachment = makeAttachment("a1", 0);
    seedCache(queryClient, recordingId, [attachment]);

    applyClipBoundsPatch(queryClient, recordingId, "a1", attachment, {
      timelineStartSec: 12,
      timelineDurationSec: 6,
      startOffsetMs: 500,
    });

    const next = queryClient.getQueryData<SongVisualMediaRecord>(songVisualQueryKey(recordingId));
    expect(next?.attachments[0].playback?.timelineStartSec).toBe(12);
    expect(next?.attachments[0].playback?.timelineDurationSec).toBe(6);
    expect(next?.attachments[0].playback?.startOffsetMs).toBe(500);
  });

  it("applies beatFx optimistically", () => {
    const queryClient = new QueryClient();
    const recordingId = "rec-1";
    const attachment = makeAttachment("a1", 0);
    seedCache(queryClient, recordingId, [attachment]);

    applyBeatFxPatch(queryClient, recordingId, "a1", {
      enabled: true,
      intensity: "subtle",
      effects: ["scale", "brightness"],
    });

    const next = queryClient.getQueryData<SongVisualMediaRecord>(songVisualQueryKey(recordingId));
    expect(next?.attachments[0].beatFx).toEqual({
      enabled: true,
      intensity: "subtle",
      effects: ["scale", "brightness"],
    });
  });

  it("restores a removed attachment on rollback", () => {
    const queryClient = new QueryClient();
    const recordingId = "rec-1";
    const attachment = makeAttachment("a1", 0);
    seedCache(queryClient, recordingId, [attachment]);

    removeAttachmentFromCache(queryClient, recordingId, "a1");
    expect(queryClient.getQueryData<SongVisualMediaRecord>(songVisualQueryKey(recordingId))?.attachments).toHaveLength(0);

    restoreAttachmentInCache(queryClient, recordingId, attachment);
    expect(queryClient.getQueryData<SongVisualMediaRecord>(songVisualQueryKey(recordingId))?.attachments).toHaveLength(1);
  });

  it("applies policy optimistically across enabled attachments", () => {
    const queryClient = new QueryClient();
    const recordingId = "rec-1";
    const attachment = makeAttachment("a1", 0);
    seedCache(queryClient, recordingId, [attachment]);

    applyPolicyPatch(queryClient, recordingId, "attachedOnly");

    const next = queryClient.getQueryData<SongVisualMediaRecord>(songVisualQueryKey(recordingId));
    expect(next?.policy).toBe("attachedOnly");
    expect(next?.attachments[0].policy).toBe("attachedOnly");
  });

  it("reconciles server attachment and refreshes derived policy", () => {
    const queryClient = new QueryClient();
    const recordingId = "rec-1";
    const attachment = makeAttachment("a1", 0);
    seedCache(queryClient, recordingId, [attachment]);

    const server = {
      ...attachment,
      policy: "attachedOnly" as const,
      playback: {
        ...attachment.playback!,
        timelineStartSec: 20,
      },
      updatedAt: "2026-01-02T00:00:00.000Z",
    };

    reconcileAttachmentInCache(queryClient, recordingId, server);
    const next = queryClient.getQueryData<SongVisualMediaRecord>(songVisualQueryKey(recordingId));
    expect(next?.policy).toBe("attachedOnly");
    expect(next?.attachments[0].playback?.timelineStartSec).toBe(20);
    expect(next?.attachments[0].updatedAt).toBe("2026-01-02T00:00:00.000Z");
  });
});
