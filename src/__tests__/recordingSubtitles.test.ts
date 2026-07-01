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
  },
}));

import { prisma } from "../lib/prisma.js";
import { createApp } from "../app.js";

const app = createApp({ skipWeb: true });

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
});
