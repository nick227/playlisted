import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    apiKey: { findFirst: vi.fn(), update: vi.fn() },
    uploadAsset: { findUnique: vi.fn() },
    playlist: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    playlistItem: { findMany: vi.fn() },
  },
}));

import { prisma } from "../lib/prisma.js";
import { createApp } from "../app.js";
import { generateApiKey, hashApiKey } from "../lib/apiKeyAuth.js";

const app = createApp();

const MOCK_USER = {
  id: "user-1", email: "u@x.com", username: "user1", displayName: "User",
  role: "CREATOR" as const, status: "ACTIVE" as const, isFeaturedArtist: false,
  bio: null, avatarUrl: null, heroImageUrl: null, passwordHash: null,
  createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-01"),
};

const OTHER_USER_ID = "user-other";
const RAW_KEY = generateApiKey();
const MOCK_KEY = {
  id: "key-1", userId: MOCK_USER.id, name: "k", keyHash: hashApiKey(RAW_KEY),
  prefix: "plt_abc", lastUsedAt: null, revokedAt: null,
  createdAt: new Date(), updatedAt: new Date(), user: MOCK_USER,
};

const AUDIO_ASSET = {
  id: "upl_audio1", userId: MOCK_USER.id, kind: "audio",
  url: "/uploads/audio/track.mp3", mimeType: "audio/mpeg", bytes: 1024,
};
const IMAGE_ASSET = {
  id: "upl_img1", userId: MOCK_USER.id, kind: "image",
  url: "/uploads/images/cover.jpg", mimeType: "image/jpeg", bytes: 512,
};

const MOCK_PLAYLIST_ROW = {
  id: "pl-1", ownerId: MOCK_USER.id, title: "Night Signals", slug: "night-signals",
  description: null, coverArtUrl: null, type: "PLAYLIST", visibility: "PRIVATE",
  status: "DRAFT", externalSource: "desktop-sync", externalId: "album-night-signals",
  createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-01"),
};

function mockApiKey() {
  vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(MOCK_KEY as any);
  vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);
}

function mockPlaylistSlugLookup() {
  vi.mocked(prisma.playlist.findFirst)
    .mockResolvedValueOnce(null)
    .mockResolvedValue(null);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);
  vi.mocked(prisma.playlistItem.findMany).mockResolvedValue([] as any);
  vi.mocked(prisma.playlist.update).mockResolvedValue({} as any);
});

const PLAYLIST_BODY = {
  externalSource: "desktop-sync",
  externalId: "album-night-signals",
  title: "Night Signals",
  visibility: "PRIVATE",
};

describe("POST /api/v1/ingest/playlists", () => {
  it("creates a new playlist and returns created: true", async () => {
    mockApiKey();
    mockPlaylistSlugLookup();
    vi.mocked(prisma.playlist.create).mockResolvedValue(MOCK_PLAYLIST_ROW as any);

    const res = await request(app)
      .post("/api/v1/ingest/playlists")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(PLAYLIST_BODY);

    expect(res.status).toBe(201);
    expect(res.body.created).toBe(true);
    expect(res.body.playlist.id).toBe("pl-1");
  });

  it("updates existing playlist and returns created: false", async () => {
    mockApiKey();
    vi.mocked(prisma.playlist.findFirst).mockResolvedValue(MOCK_PLAYLIST_ROW as any);
    vi.mocked(prisma.playlist.update).mockResolvedValue({
      ...MOCK_PLAYLIST_ROW, title: "Night Signals (updated)",
    } as any);

    const res = await request(app)
      .post("/api/v1/ingest/playlists")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send({ ...PLAYLIST_BODY, title: "Night Signals (updated)" });

    expect(res.status).toBe(200);
    expect(res.body.created).toBe(false);
    expect(vi.mocked(prisma.playlist.create)).not.toHaveBeenCalled();
  });

  it("defaults visibility to PRIVATE when not provided", async () => {
    mockApiKey();
    mockPlaylistSlugLookup();
    vi.mocked(prisma.playlist.create).mockResolvedValue(MOCK_PLAYLIST_ROW as any);

    await request(app)
      .post("/api/v1/ingest/playlists")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send({ externalSource: "desktop-sync", externalId: "pl-x", title: "Test" });

    const createArg = vi.mocked(prisma.playlist.create).mock.calls[0][0];
    expect(createArg.data.visibility).toBe("PRIVATE");
  });

  it("resolves coverUploadId to its URL for the owner", async () => {
    mockApiKey();
    vi.mocked(prisma.uploadAsset.findUnique).mockResolvedValue(IMAGE_ASSET as any);
    vi.mocked(prisma.playlist.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValue(null);
    vi.mocked(prisma.playlist.create).mockResolvedValue(MOCK_PLAYLIST_ROW as any);

    await request(app)
      .post("/api/v1/ingest/playlists")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send({ ...PLAYLIST_BODY, coverUploadId: IMAGE_ASSET.id });

    const createArg = vi.mocked(prisma.playlist.create).mock.calls[0][0];
    expect(createArg.data.coverArtUrl).toBe(IMAGE_ASSET.url);
  });

  it("returns 403 when coverUploadId belongs to a different user", async () => {
    mockApiKey();
    vi.mocked(prisma.uploadAsset.findUnique).mockResolvedValue({
      ...IMAGE_ASSET, userId: OTHER_USER_ID,
    } as any);

    const res = await request(app)
      .post("/api/v1/ingest/playlists")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send({ ...PLAYLIST_BODY, coverUploadId: IMAGE_ASSET.id });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("upload_forbidden");
  });

  it("returns 400 when coverUploadId has kind=audio instead of image", async () => {
    mockApiKey();
    vi.mocked(prisma.uploadAsset.findUnique).mockResolvedValue(AUDIO_ASSET as any);

    const res = await request(app)
      .post("/api/v1/ingest/playlists")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send({ ...PLAYLIST_BODY, coverUploadId: AUDIO_ASSET.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("upload_kind_mismatch");
  });

  it("does not change visibility when omitted on update", async () => {
    mockApiKey();
    vi.mocked(prisma.playlist.findFirst).mockResolvedValue({
      ...MOCK_PLAYLIST_ROW, visibility: "PUBLIC",
    } as any);
    vi.mocked(prisma.playlist.update).mockResolvedValue(MOCK_PLAYLIST_ROW as any);

    await request(app)
      .post("/api/v1/ingest/playlists")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send({ externalSource: "desktop-sync", externalId: "album-night-signals", title: "Night Signals" });

    const updateArg = vi.mocked(prisma.playlist.update).mock.calls[0][0];
    // visibility not provided → should not appear in the update data
    expect(updateArg.data).not.toHaveProperty("visibility");
  });
});

describe("playlist ingest — idempotency and scoping", () => {
  it("upserting the same externalId twice returns created: false on the second call", async () => {
    mockApiKey();
    vi.mocked(prisma.playlist.findFirst).mockResolvedValue(MOCK_PLAYLIST_ROW as any);
    vi.mocked(prisma.playlist.update).mockResolvedValue(MOCK_PLAYLIST_ROW as any);

    const res = await request(app)
      .post("/api/v1/ingest/playlists")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(PLAYLIST_BODY);

    expect(res.status).toBe(200);
    expect(res.body.created).toBe(false);
  });

  it("playlist lookup uses ownerId scoping", async () => {
    mockApiKey();
    mockPlaylistSlugLookup();
    vi.mocked(prisma.playlist.create).mockResolvedValue(MOCK_PLAYLIST_ROW as any);

    await request(app)
      .post("/api/v1/ingest/playlists")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(PLAYLIST_BODY);

    const findArg = vi.mocked(prisma.playlist.findFirst).mock.calls[0]?.[0];
    expect(findArg?.where).toMatchObject({ ownerId: MOCK_USER.id });
  });

  it("rejects missing externalSource (OpenAPI required field)", async () => {
    mockApiKey();
    const res = await request(app)
      .post("/api/v1/ingest/playlists")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send({ externalId: "pl-x", title: "Test" });

    expect(res.status).toBe(400);
  });

  it("rejects missing externalId (OpenAPI required field)", async () => {
    mockApiKey();
    const res = await request(app)
      .post("/api/v1/ingest/playlists")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send({ externalSource: "desktop-sync", title: "Test" });

    expect(res.status).toBe(400);
  });

  it("coverUploadId can be omitted — coverArtUrl defaults to null on create", async () => {
    mockApiKey();
    mockPlaylistSlugLookup();
    vi.mocked(prisma.playlist.create).mockResolvedValue(MOCK_PLAYLIST_ROW as any);

    await request(app)
      .post("/api/v1/ingest/playlists")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(PLAYLIST_BODY);

    const createArg = vi.mocked(prisma.playlist.create).mock.calls[0][0];
    expect(createArg.data.coverArtUrl).toBeNull();
    expect(vi.mocked(prisma.uploadAsset.findUnique)).not.toHaveBeenCalled();
  });
});
