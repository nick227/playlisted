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

describe("GET /api/v1/search/suggestions", () => {
  beforeEach(() => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
    vi.mocked(prisma.recording.findMany).mockResolvedValue([]);
    vi.mocked(prisma.playlist.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
  });

  it("returns 400 when q is missing", async () => {
    const res = await request(app).get("/api/v1/search/suggestions");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("request_validation_failed");
  });

  it("returns 400 when q is blank", async () => {
    const res = await request(app).get("/api/v1/search/suggestions").query({ q: "   " });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("search_query_required");
  });

  it("returns lightweight grouped suggestions", async () => {
    vi.mocked(prisma.recording.findMany).mockResolvedValue([
      {
        id: "rec-1",
        title: "Jazz Night",
        artworkUrl: null,
        durationSeconds: 95,
        uploader: { displayName: "Alice", username: "alice" },
        publishedPlaylist: {
          id: "pl-1",
          title: "Blue Hour",
          slug: "blue-hour",
          coverArtUrl: "/uploads/images/cover.webp",
          owner: { username: "alice" },
        },
      },
    ] as never);
    vi.mocked(prisma.playlist.findMany).mockResolvedValue([
      {
        id: "pl-2",
        title: "Jazz Picks",
        slug: "jazz-picks",
        coverArtUrl: null,
        itemCount: 12,
        owner: { displayName: "Bob", username: "bob" },
      },
    ] as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: "user-1",
        username: "alice",
        displayName: "Alice",
        avatarUrl: null,
      },
    ] as never);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      {
        id: "tag-jazz",
        name: "Jazz",
        slug: "jazz",
        songCount: BigInt(42),
      },
    ] as never);

    const res = await request(app)
      .get("/api/v1/search/suggestions")
      .query({ q: "jaz", limit: 2 });

    expect(res.status).toBe(200);
    expect(res.body.groups).toEqual([
      {
        label: "Songs",
        options: [
          {
            id: "song-rec-1",
            kind: "song",
            label: "Jazz Night",
            meta: "Alice · Blue Hour · 1:35",
            href: "/@/alice/blue-hour#track-rec-1",
            imageUrl: "/uploads/images/cover.webp",
          },
        ],
      },
      {
        label: "Artists",
        options: [
          {
            id: "artist-user-1",
            kind: "artist",
            label: "Alice",
            meta: "@alice",
            href: "/@/alice",
            imageUrl: null,
          },
        ],
      },
      {
        label: "Playlists",
        options: [
          {
            id: "playlist-pl-2",
            kind: "playlist",
            label: "Jazz Picks",
            meta: "Bob · 12 tracks",
            href: "/@/bob/jazz-picks",
            imageUrl: null,
          },
        ],
      },
      {
        label: "Genres",
        options: [
          {
            id: "genre-tag-jazz",
            kind: "genre",
            label: "Jazz",
            meta: "42 tracks",
            href: "/genres/jazz",
          },
        ],
      },
    ]);
    expect(prisma.recording.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          id: true,
          title: true,
          artworkUrl: true,
          durationSeconds: true,
        }),
        take: 2,
      }),
    );
  });
});
