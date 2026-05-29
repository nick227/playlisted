import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    recording: { findMany: vi.fn() },
    playlist: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    tag: { findMany: vi.fn() },
  },
}));

import { prisma } from "../lib/prisma.js";
import { createApp } from "../app.js";

const app = createApp();

describe("GET /api/v1/search/unified", () => {
  beforeEach(() => {
    vi.mocked(prisma.recording.findMany).mockResolvedValue([]);
    vi.mocked(prisma.playlist.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.tag.findMany).mockResolvedValue([]);
  });

  it("returns 400 when q is missing", async () => {
    const res = await request(app).get("/api/v1/search/unified");
    expect(res.status).toBe(400);
  });

  it("returns 400 when q is blank", async () => {
    const res = await request(app).get("/api/v1/search/unified").query({ q: "   " });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("search_query_required");
  });

  it("returns grouped results including genres", async () => {
    vi.mocked(prisma.tag.findMany).mockResolvedValue([
      {
        id: "tag-jazz",
        name: "Jazz",
        slug: "jazz",
        kind: "GENRE",
        createdAt: new Date("2024-01-01"),
        _count: { recordingTags: 42 },
      },
    ] as never);

    const res = await request(app).get("/api/v1/search/unified").query({ q: "jaz", pageSize: 5 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      songs: [],
      playlists: [],
      artists: [],
      genres: [{ id: "tag-jazz", name: "Jazz", slug: "jazz", songCount: 42 }],
    });
    expect(prisma.tag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          kind: "GENRE",
          OR: [{ name: { contains: "jaz" } }, { slug: { contains: "jaz" } }],
        },
        take: 5,
      }),
    );
  });
});
