import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    recording: {
      findUnique: vi.fn(),
    },
    recordingSubtitle: {
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    session: {
      findFirst: vi.fn(),
      update: vi.fn(),
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

const publicRecording = {
  id: "rec-1",
  uploaderId: "user-1",
  visibility: "PUBLIC",
  status: "PUBLISHED",
  publishedPlaylist: {
    id: "playlist-1",
    ownerId: "user-1",
    visibility: "PUBLIC",
    status: "PUBLISHED",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.session.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.session.update).mockResolvedValue({} as never);
  vi.mocked(prisma.recordingSubtitle.updateMany).mockResolvedValue({ count: 0 } as never);
});

describe("recording subtitles API", () => {
  it("returns a ready inactive worker transcript instead of a stale queued placeholder", async () => {
    vi.mocked(prisma.recording.findUnique).mockResolvedValue({
      ...publicRecording,
      subtitles: [
        {
          status: "QUEUED",
          language: null,
          segments: null,
          vttText: null,
          errorMessage: null,
          isActive: true,
          createdAt: new Date("2026-01-02T00:00:00Z"),
        },
        {
          status: "READY",
          language: "en",
          segments: null,
          vttText: `WEBVTT

00:00:01.000 --> 00:00:02.500
hello there`,
          errorMessage: null,
          isActive: false,
          createdAt: new Date("2026-01-01T00:00:00Z"),
        },
      ],
    } as never);

    const res = await request(app).get("/api/v1/recordings/rec-1/subtitles");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "READY",
      language: "en",
      segments: [{ start: 1, end: 2.5, text: "hello there" }],
    });
  });

  it("returns MISSING when a recording has no subtitle rows", async () => {
    vi.mocked(prisma.recording.findUnique).mockResolvedValue({
      ...publicRecording,
      subtitles: [],
    } as never);

    const res = await request(app).get("/api/v1/recordings/rec-1/subtitles");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "MISSING" });
  });

  it("creates a manual ready transcript from pasted SRT text", async () => {
    vi.mocked(prisma.session.findFirst).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.recording.findUnique).mockResolvedValue({
      id: "rec-1",
      uploaderId: "user-1",
    } as never);
    vi.mocked(prisma.recordingSubtitle.create).mockResolvedValue({
      id: "sub-1",
      recordingId: "rec-1",
      source: "MANUAL",
      status: "READY",
      language: null,
      vttText: `WEBVTT

00:00:01.000 --> 00:00:02.500
hello there
`,
      errorMessage: null,
      isActive: true,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      generatedAt: new Date("2026-01-01T00:00:01Z"),
    } as never);

    const res = await request(app)
      .post("/api/v1/recordings/rec-1/transcripts")
      .set("Authorization", "Bearer session-token")
      .send({
        srtText: `1
00:00:01,000 --> 00:00:02,500
hello there`,
      });

    expect(res.status).toBe(201);
    expect(prisma.recordingSubtitle.updateMany).toHaveBeenCalledWith({
      where: { recordingId: "rec-1" },
      data: { isActive: false },
    });
    expect(prisma.recordingSubtitle.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recordingId: "rec-1",
        source: "MANUAL",
        status: "READY",
        isActive: true,
      }),
    });
    expect(res.body).toMatchObject({
      id: "sub-1",
      source: "MANUAL",
      status: "READY",
      isActive: true,
      srtText: expect.stringContaining("hello there"),
    });
  });
});
