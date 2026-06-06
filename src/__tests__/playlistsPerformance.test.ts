import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    playlist: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "../lib/prisma.js";
import { clearPublicJsonCache } from "../lib/publicJsonCache.js";
import { createApp } from "../app.js";

const app = createApp();

describe("GET /api/v1/playlists/random", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPublicJsonCache();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.mocked(prisma.playlist.count).mockResolvedValue(25);
    vi.mocked(prisma.playlist.findMany).mockResolvedValue([
      {
        id: "playlist-1",
        title: "Middle Rotation",
        slug: "middle-rotation",
        coverArtUrl: null,
        type: "PLAYLIST",
        itemCount: 8,
        totalDurationSeconds: 1_440,
        owner: {
          id: "user-1",
          username: "artist",
          displayName: "Artist",
          avatarUrl: null,
          role: "CREATOR",
        },
        tags: [],
      },
    ] as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses a bounded random offset instead of ORDER BY RAND", async () => {
    const res = await request(app).get("/api/v1/playlists/random?limit=5");

    expect(res.status).toBe(200);
    expect(res.headers["x-playlisted-cache"]).toBe("MISS");
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.playlist.count).toHaveBeenCalledWith({
      where: { visibility: "PUBLIC", status: "PUBLISHED" },
    });
    expect(prisma.playlist.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { visibility: "PUBLIC", status: "PUBLISHED" },
      skip: 10,
      take: 5,
    }));
  });

  it("serves repeated random playlist requests from the short public cache", async () => {
    await request(app).get("/api/v1/playlists/random?limit=5");
    const second = await request(app).get("/api/v1/playlists/random?limit=5");

    expect(second.status).toBe(200);
    expect(second.headers["x-playlisted-cache"]).toBe("HIT");
    expect(prisma.playlist.count).toHaveBeenCalledTimes(1);
    expect(prisma.playlist.findMany).toHaveBeenCalledTimes(1);
  });
});
