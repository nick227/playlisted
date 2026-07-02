import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    recording: {
      findUnique: vi.fn(),
    },
    session: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    visualMediaAsset: {
      findFirst: vi.fn(),
    },
    songVisualAttachment: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "../lib/prisma.js";
import { createApp } from "../app.js";

const app = createApp({ skipWeb: true });

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  username: "testuser",
  displayName: "Test User",
  role: "CREATOR" as const,
  status: "ACTIVE" as const,
  isFeaturedArtist: false,
  bio: null,
  avatarUrl: null,
  heroImageUrl: null,
  passwordHash: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const mockSession = {
  id: "session-1",
  userId: mockUser.id,
  tokenHash: "irrelevant-hash",
  expiresAt: new Date(Date.now() + 86_400_000),
  lastUsedAt: null,
  revokedAt: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  user: mockUser,
};

const ownedRecording = {
  id: "rec-1",
  uploaderId: "user-1",
  visibility: "PUBLIC" as const,
  status: "PUBLISHED" as const,
};

const mockMediaAsset = {
  id: "asset-1",
  ownerId: "user-1",
  mediaType: "VIDEO" as const,
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
};

const mockAttachment = {
  id: "att-1",
  recordingId: "rec-1",
  mediaAssetId: "asset-1",
  policy: "PREFER_ATTACHED" as const,
  weight: 1,
  sortOrder: 0,
  label: "Clip",
  playbackJson: { loop: true, muted: true },
  rotationJson: null,
  beatFxJson: null,
  tagsJson: null,
  enabled: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  mediaAsset: mockMediaAsset,
};

function mockAuthenticatedOwner() {
  vi.mocked(prisma.session.findFirst).mockResolvedValue(mockSession as never);
  vi.mocked(prisma.session.update).mockResolvedValue({} as never);
  vi.mocked(prisma.recording.findUnique).mockResolvedValue(ownedRecording as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.session.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.session.update).mockResolvedValue({} as never);
});

describe("song visual media routes", () => {
  it("POST rejects malformed playbackJson with invalid_attachment before create", async () => {
    mockAuthenticatedOwner();

    const res = await request(app)
      .post("/api/v1/songs/rec-1/visual-media")
      .set("Authorization", "Bearer session-token")
      .send({
        mediaAssetId: "asset-1",
        playback: {
          timelineStartSec: Number.NaN,
          timelineDurationSec: Number.POSITIVE_INFINITY,
        },
      });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: "invalid_attachment",
    });
    expect(res.body.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "playback.timelineStartSec" }),
        expect.objectContaining({ field: "playback.timelineDurationSec" }),
      ]),
    );
    expect(prisma.songVisualAttachment.create).not.toHaveBeenCalled();
    expect(prisma.visualMediaAsset.findFirst).not.toHaveBeenCalled();
  });

  it("PATCH rejects malformed playbackJson with invalid_attachment before update", async () => {
    mockAuthenticatedOwner();
    vi.mocked(prisma.songVisualAttachment.findFirst).mockResolvedValue(mockAttachment as never);

    const res = await request(app)
      .patch("/api/v1/songs/rec-1/visual-media/att-1")
      .set("Authorization", "Bearer session-token")
      .send({
        playback: ["not-an-object"],
      });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: "invalid_attachment",
    });
    expect(res.body.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "playback" }),
      ]),
    );
    expect(prisma.songVisualAttachment.update).not.toHaveBeenCalled();
  });
});
