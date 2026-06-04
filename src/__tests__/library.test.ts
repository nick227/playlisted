import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    tag: { findMany: vi.fn() },
    playlist: { findMany: vi.fn() },
  },
}));

import { prisma } from "../lib/prisma.js";
import { createApp } from "../app.js";

const app = createApp();

const BROWSABLE_RECORDING = {
  visibility: "PUBLIC",
  status: "PUBLISHED",
  publishedPlaylist: { visibility: "PUBLIC", status: "PUBLISHED" },
};

describe("GET /api/v1/library/genres", () => {
  beforeEach(() => {
    vi.mocked(prisma.tag.findMany).mockResolvedValue([]);
    vi.mocked(prisma.playlist.findMany).mockResolvedValue([]);
  });

  it("returns only genres with browsable recordings and browsable-only counts", async () => {
    vi.mocked(prisma.tag.findMany).mockResolvedValue([
      {
        id: "tag-jazz",
        name: "Jazz",
        slug: "jazz",
        kind: "GENRE",
        createdAt: new Date("2024-01-01"),
        _count: { recordingTags: 2 },
      },
    ] as never);

    const res = await request(app).get("/api/v1/library/genres");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [{ id: "tag-jazz", name: "Jazz", slug: "jazz", songCount: 2 }],
    });
    expect(prisma.tag.findMany).toHaveBeenCalledWith({
      where: {
        kind: "GENRE",
        recordingTags: {
          some: {
            recording: BROWSABLE_RECORDING,
          },
        },
      },
      include: {
        _count: {
          select: {
            recordingTags: {
              where: {
                recording: BROWSABLE_RECORDING,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });
  });

  it("omits genres that only have draft or private recordings", async () => {
    vi.mocked(prisma.tag.findMany).mockResolvedValue([]);

    const res = await request(app).get("/api/v1/library/genres");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("does not include playlist-only genres in library filter chips", async () => {
    vi.mocked(prisma.tag.findMany).mockResolvedValue([]);
    vi.mocked(prisma.playlist.findMany).mockResolvedValue([
      {
        itemCount: 3,
        tags: [{ tag: { id: "tag-house", name: "House", slug: "house" } }],
      },
    ] as never);

    const res = await request(app).get("/api/v1/library/genres");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(prisma.playlist.findMany).not.toHaveBeenCalled();
  });
});
