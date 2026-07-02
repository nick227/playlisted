import { describe, expect, it } from "vitest";

import { VISUAL_UPLOAD_LIMITS } from "../lib/visualMedia/constants.js";
import { validateAttachmentBody } from "../lib/visualMedia/validateAttachment.js";
import { parseVisualUploadMetadata } from "../lib/visualMedia/validateUploadMetadata.js";
import { UPLOAD_MAX_BYTES } from "../lib/uploadPolicy.js";

const validPlayback = {
  loop: true,
  muted: true,
  objectFit: "cover",
  startOffsetMs: 1500,
  timelineStartSec: 4.5,
  timelineDurationSec: 12,
};

const validRotation = {
  mode: "timedMusicAware",
  minHoldMs: 1000,
  targetHoldMs: 2500,
  maxHoldMs: 5000,
  gate: { kind: "beatEdge" },
};

const validBeatFx = {
  enabled: true,
  intensity: "subtle",
  effects: ["scale", "brightness"],
};

describe("validateAttachmentBody", () => {
  it("accepts a valid create payload and strips unknown playback keys", () => {
    const result = validateAttachmentBody({
      mediaAssetId: "asset-1",
      policy: "preferAttached",
      weight: 2,
      order: 3,
      label: "Intro",
      enabled: true,
      playback: { ...validPlayback, hackerField: true },
      rotation: validRotation,
      beatFx: validBeatFx,
      tags: ["user-media"],
    }, "create");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.playback).toEqual(validPlayback);
    expect(result.value.rotation).toEqual(validRotation);
    expect(result.value.beatFx).toEqual(validBeatFx);
    expect(result.value.policy).toBe("preferAttached");
    expect(result.value.weight).toBe(2);
    expect(result.value.order).toBe(3);
  });

  it("rejects malformed playback json", () => {
    const result = validateAttachmentBody({
      mediaAssetId: "asset-1",
      playback: ["not-an-object"],
    }, "create");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.field === "playback")).toBe(true);
  });

  it("rejects invalid policy, weight, and order", () => {
    const result = validateAttachmentBody({
      mediaAssetId: "asset-1",
      policy: "defaultOnly",
      weight: 0,
      order: -1,
    }, "create");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.field === "policy")).toBe(true);
    expect(result.issues.some((issue) => issue.field === "weight")).toBe(true);
    expect(result.issues.some((issue) => issue.field === "order")).toBe(true);
  });

  it("rejects NaN, Infinity, and negative timeline values", () => {
    const result = validateAttachmentBody({
      mediaAssetId: "asset-1",
      playback: {
        timelineStartSec: Number.NaN,
        timelineDurationSec: Number.POSITIVE_INFINITY,
        startOffsetMs: -10,
      },
    }, "create");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.field === "playback.timelineStartSec")).toBe(true);
    expect(result.issues.some((issue) => issue.field === "playback.timelineDurationSec")).toBe(true);
    expect(result.issues.some((issue) => issue.field === "playback.startOffsetMs")).toBe(true);
  });

  it("rejects invalid beatFx effects and intensity", () => {
    const result = validateAttachmentBody({
      mediaAssetId: "asset-1",
      beatFx: {
        enabled: true,
        intensity: "wild",
        effects: ["scale", "strobe"],
      },
    }, "create");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.field === "beatFx.intensity")).toBe(true);
    expect(result.issues.some((issue) => issue.field === "beatFx.effects[1]")).toBe(true);
  });

  it("rejects invalid rotation hold windows", () => {
    const result = validateAttachmentBody({
      mediaAssetId: "asset-1",
      rotation: {
        minHoldMs: 5000,
        targetHoldMs: 2000,
        maxHoldMs: 1000,
      },
    }, "create");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.code === "invalid_hold_window")).toBe(true);
  });

  it("valid patch payload only validates provided fields", () => {
    const result = validateAttachmentBody({
      playback: {
        timelineStartSec: 8,
        timelineDurationSec: 16,
        startOffsetMs: 0,
      },
    }, "patch");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.playback).toEqual({
      timelineStartSec: 8,
      timelineDurationSec: 16,
      startOffsetMs: 0,
    });
    expect(result.value.weight).toBeUndefined();
  });

  it("round-trips nullable json fields for patch clears", () => {
    const result = validateAttachmentBody({
      rotation: null,
      beatFx: null,
      tags: null,
    }, "patch");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.rotation).toBeNull();
    expect(result.value.beatFx).toBeNull();
    expect(result.value.tags).toBeNull();
  });
});

describe("parseVisualUploadMetadata", () => {
  it("stores sane client-probed metadata for video uploads", () => {
    expect(parseVisualUploadMetadata({
      durationMs: "45000",
      width: "1920",
      height: "1080",
    }, "video")).toEqual({
      durationMs: 45000,
      width: 1920,
      height: 1080,
    });
  });

  it("ignores invalid or oversized metadata", () => {
    expect(parseVisualUploadMetadata({
      durationMs: Number.NaN,
      width: 999999,
      height: -10,
    }, "video")).toEqual({
      durationMs: null,
      width: null,
      height: null,
    });
  });

  it("drops duration metadata for images", () => {
    expect(parseVisualUploadMetadata({
      durationMs: 1000,
      width: 800,
      height: 600,
    }, "image")).toEqual({
      durationMs: null,
      width: 800,
      height: 600,
    });
  });
});

describe("visual upload limits", () => {
  it("matches frontend visual upload caps", () => {
    expect(UPLOAD_MAX_BYTES.video).toBe(VISUAL_UPLOAD_LIMITS.videoBytes);
    expect(UPLOAD_MAX_BYTES.image).toBe(VISUAL_UPLOAD_LIMITS.imageBytes);
    expect(VISUAL_UPLOAD_LIMITS.videoBytes).toBe(250 * 1024 * 1024);
    expect(VISUAL_UPLOAD_LIMITS.imageBytes).toBe(15 * 1024 * 1024);
  });
});
