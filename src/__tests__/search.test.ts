import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    recording: { findMany: vi.fn() },
    playlist: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    tag: { findMany: vi.fn() },
  },
}));

import { prisma } from "../lib/prisma.js";
import { createApp } from "../app.js";

const app = createApp();

const PUBLIC_RECORDING = { visibility: "PUBLIC", status: "PUBLISHED" };
const BROWSABLE_RECORDING = {
  ...PUBLIC_RECORDING,
  publishedPlaylist: { visibility: "PUBLIC", status: "PUBLISHED" },
};
const SEARCHABLE_PLAYLIST = {
  OR: [
    { visibility: "PUBLIC", status: { in: ["PUBLISHED", "DRAFT"] } },
    { visibility: "UNLISTED", status: "PUBLISHED" },
  ],
};

describe("GET /api/v1/search/unified", () => {
  beforeEach(() => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
    vi.mocked(prisma.recording.findMany).mockResolvedValue([]);
    vi.mocked(prisma.playlist.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
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

  it("returns grouped results with public-only genre counts", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      {
        id: "tag-jazz",
        name: "Jazz",
        slug: "jazz",
        songCount: BigInt(42),
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
  });

  it("matches playlists by slug when the query uses spaces", async () => {
    const res = await request(app).get("/api/v1/search/unified").query({ q: "new and goood" });

    expect(res.status).toBe(200);
    expect(prisma.playlist.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            SEARCHABLE_PLAYLIST,
            {
              OR: expect.arrayContaining([
                { title: { contains: "new and goood" } },
                { slug: "new-and-goood" },
              ]),
            },
          ],
        },
      }),
    );
  });

  it("matches songs on searchable playlists by title", async () => {
    const res = await request(app).get("/api/v1/search/unified").query({ q: "summer mix" });

    expect(res.status).toBe(200);
    expect(prisma.recording.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            BROWSABLE_RECORDING,
            {
              OR: expect.arrayContaining([
                {
                  publishedPlaylist: {
                    AND: [
                      SEARCHABLE_PLAYLIST,
                      { OR: expect.arrayContaining([{ title: { contains: "summer mix" } }]) },
                    ],
                  },
                },
              ]),
            },
          ],
        },
      }),
    );
  });

  it("orders genres by public song count descending", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      {
        id: "tag-rock",
        name: "Rock",
        slug: "rock",
        songCount: BigInt(5),
      },
      {
        id: "tag-jazz",
        name: "Jazz",
        slug: "jazz",
        songCount: BigInt(42),
      },
    ] as never);

    const res = await request(app).get("/api/v1/search/unified").query({ q: "a", pageSize: 1 });

    expect(res.status).toBe(200);
    expect(res.body.genres).toEqual([
      { id: "tag-jazz", name: "Jazz", slug: "jazz", songCount: 42 },
    ]);
  });
});
