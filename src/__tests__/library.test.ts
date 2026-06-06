import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    tag: { findMany: vi.fn() },
    playlist: { findMany: vi.fn() },
    recording: { count: vi.fn(), findMany: vi.fn() },
  },
}));

import { prisma } from "../lib/prisma.js";
import { clearPublicJsonCache } from "../lib/publicJsonCache.js";
import { createApp } from "../app.js";

const app = createApp();

const BROWSABLE_RECORDING = {
  visibility: "PUBLIC",
  status: "PUBLISHED",
  publishedPlaylist: { visibility: "PUBLIC", status: "PUBLISHED" },
};

beforeEach(() => {
  vi.clearAllMocks();
  clearPublicJsonCache();
});

describe("GET /api/v1/library/genres", () => {
  beforeEach(() => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
    vi.mocked(prisma.tag.findMany).mockResolvedValue([]);
    vi.mocked(prisma.playlist.findMany).mockResolvedValue([]);
    vi.mocked(prisma.recording.count).mockResolvedValue(0);
    vi.mocked(prisma.recording.findMany).mockResolvedValue([]);
  });

  it("returns genres with browsable recordings and merged browsable counts", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      {
        id: "tag-acoustic",
        name: "Acoustic Guitar",
        slug: "acoustic-guitar",
        songCount: BigInt(2),
      },
      {
        id: "tag-jazz",
        name: "Jazz",
        slug: "jazz",
        songCount: BigInt(1),
      },
    ] as never);

    const res = await request(app).get("/api/v1/library/genres");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [
        { id: "tag-acoustic", name: "Acoustic Guitar", slug: "acoustic-guitar", songCount: 2 },
        { id: "tag-jazz", name: "Jazz", slug: "jazz", songCount: 1 },
      ],
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("omits genres that only have draft or private recordings", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

    const res = await request(app).get("/api/v1/library/genres");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("passes minSongCount through to the genre count query", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

    const res = await request(app).get("/api/v1/library/genres?minSongCount=5");

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.$queryRaw).mock.calls[0]?.[0]).toMatchObject({
      values: [5],
    });
  });

  it("does not query standalone playlist tags for library genres", async () => {
    await request(app).get("/api/v1/library/genres");

    expect(prisma.tag.findMany).not.toHaveBeenCalled();
    expect(prisma.playlist.findMany).not.toHaveBeenCalled();
    expect(prisma.recording.findMany).not.toHaveBeenCalled();
  });

  it("serves repeated genre requests from the short public cache", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      {
        id: "tag-jazz",
        name: "Jazz",
        slug: "jazz",
        songCount: BigInt(1),
      },
    ] as never);

    const first = await request(app).get("/api/v1/library/genres");
    const second = await request(app).get("/api/v1/library/genres");

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.headers["x-playlisted-cache"]).toBe("MISS");
    expect(second.headers["x-playlisted-cache"]).toBe("HIT");
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/v1/library/playlist-genres", () => {
  beforeEach(() => {
    vi.mocked(prisma.tag.findMany).mockResolvedValue([
      {
        id: "tag-vaporwave",
        name: "Vaporwave",
        slug: "vaporwave",
        _count: { playlistTags: 3 },
      },
    ] as never);
  });

  it("returns genres with public published playlists", async () => {
    const res = await request(app).get("/api/v1/library/playlist-genres");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      { id: "tag-vaporwave", name: "Vaporwave", slug: "vaporwave", songCount: 3 },
    ]);
  });
});

describe("GET /api/v1/library/songs", () => {
  beforeEach(() => {
    vi.mocked(prisma.recording.count).mockResolvedValue(1);
    vi.mocked(prisma.recording.findMany).mockResolvedValue([
      {
        id: "recording-1",
        uploaderId: "user-1",
        publishedPlaylistId: "playlist-1",
        title: "Quiet Static",
        description: null,
        audioUrl: "/audio/quiet-static.mp3",
        audioMimeType: "audio/mpeg",
        audioBytes: BigInt(123),
        durationSeconds: 180,
        artworkUrl: null,
        recordingType: "SONG",
        visibility: "PUBLIC",
        status: "PUBLISHED",
        trackNumber: 1,
        episodeNumber: null,
        explicit: false,
        releaseDate: null,
        publishedAt: new Date("2024-01-01"),
        playCount: 4,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-02"),
        uploader: {
          id: "user-1",
          username: "artist",
          displayName: "Artist",
          avatarUrl: null,
          role: "CREATOR",
        },
        publishedPlaylist: {
          id: "playlist-1",
          slug: "quiet-static",
          title: "Quiet Static",
          coverArtUrl: null,
          tags: [{ tag: { id: "tag-vaporwave", name: "Vaporwave", slug: "vaporwave" } }],
        },
        tags: [{ tag: { id: "tag-ambient", name: "Ambient", slug: "ambient" } }],
        _count: { saves: 2 },
      },
    ] as never);
  });

  it("filters songs by direct recording genres or canonical playlist genres", async () => {
    const res = await request(app).get("/api/v1/library/songs?genre=vaporwave");

    expect(res.status).toBe(200);
    expect(prisma.recording.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        ...BROWSABLE_RECORDING,
        OR: [
          { tags: { some: { tag: { slug: "vaporwave", kind: "GENRE" } } } },
          { publishedPlaylist: { tags: { some: { tag: { slug: "vaporwave", kind: "GENRE" } } } } },
        ],
      },
    }));
    expect(res.body.data[0].genres).toEqual([
      { id: "tag-ambient", name: "Ambient", slug: "ambient" },
      { id: "tag-vaporwave", name: "Vaporwave", slug: "vaporwave" },
    ]);
  });
});

describe("GET /api/v1/library/artists", () => {
  beforeEach(() => {
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([
        {
          id: "user-1",
          username: "artist",
          displayName: "Artist",
          avatarUrl: null,
          songCount: BigInt(3),
          earliestYear: 2022,
          latestYear: 2024,
        },
      ] as never)
      .mockResolvedValueOnce([
        { uploaderId: "user-1", id: "tag-ambient", name: "Ambient", slug: "ambient" },
        { uploaderId: "user-1", id: "tag-jazz", name: "Jazz", slug: "jazz" },
      ] as never);
  });

  it("aggregates artist summaries in SQL instead of loading all recordings", async () => {
    const res = await request(app).get("/api/v1/library/artists");

    expect(res.status).toBe(200);
    expect(res.headers["x-playlisted-cache"]).toBe("MISS");
    expect(res.body.data).toEqual([
      {
        id: "user-1",
        username: "artist",
        displayName: "Artist",
        avatarUrl: null,
        songCount: 3,
        genres: [
          { id: "tag-ambient", name: "Ambient", slug: "ambient" },
          { id: "tag-jazz", name: "Jazz", slug: "jazz" },
        ],
        yearRange: { earliest: 2022, latest: 2024 },
      },
    ]);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(prisma.recording.findMany).not.toHaveBeenCalled();
  });
});
