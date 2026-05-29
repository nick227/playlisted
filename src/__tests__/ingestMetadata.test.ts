import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    apiKey: { findFirst: vi.fn(), update: vi.fn() },
    uploadAsset: { findFirst: vi.fn() },
    playlist: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    recording: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    playlistItem: { aggregate: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "../lib/prisma.js";
import { createApp } from "../app.js";
import { generateApiKey, hashApiKey } from "../lib/apiKeyAuth.js";

const app = createApp();

// ── fixtures ──────────────────────────────────────────────────────────────────

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

const MOCK_RECORDING_ROW = {
  id: "rec-1", uploaderId: MOCK_USER.id, publishedPlaylistId: "pl-1",
  title: "Neon Window", description: null, audioUrl: "/uploads/audio/track.mp3",
  audioMimeType: "audio/mpeg", audioBytes: BigInt(1024), durationSeconds: null,
  artworkUrl: null, trackNumber: 1, recordingType: "SONG", visibility: "PRIVATE",
  status: "DRAFT", externalSource: "desktop-sync", externalId: "track-01",
  createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-01"),
};

function mockApiKey() {
  vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(MOCK_KEY as any);
  vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);
}

function mockPlaylistSlugLookup() {
  // resolveUniquePlaylistSlug calls prisma.playlist.findFirst to check slug availability
  // We return null to say "slug is free"
  vi.mocked(prisma.playlist.findFirst)
    .mockResolvedValueOnce(null)  // externalId lookup → not found (create path)
    .mockResolvedValue(null);     // slug availability check → free
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

const RECORDING_BODY = {
  externalSource: "desktop-sync",
  externalId: "track-01",
  playlistExternalId: "album-night-signals",
  title: "Neon Window",
  audioUploadId: AUDIO_ASSET.id,
  trackNumber: 1,
};

// ── playlist ingest ───────────────────────────────────────────────────────────

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
    vi.mocked(prisma.uploadAsset.findFirst).mockResolvedValue(IMAGE_ASSET as any);
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
    vi.mocked(prisma.uploadAsset.findFirst).mockResolvedValue({
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
    vi.mocked(prisma.uploadAsset.findFirst).mockResolvedValue(AUDIO_ASSET as any);

    const res = await request(app)
      .post("/api/v1/ingest/playlists")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send({ ...PLAYLIST_BODY, coverUploadId: AUDIO_ASSET.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("upload_kind_mismatch");
  });
});

// ── idempotency + scoping (playlist) ─────────────────────────────────────────

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

  it("playlist lookup uses ownerId scoping — same externalId can exist for different users", async () => {
    mockApiKey();
    mockPlaylistSlugLookup();
    vi.mocked(prisma.playlist.create).mockResolvedValue(MOCK_PLAYLIST_ROW as any);

    await request(app)
      .post("/api/v1/ingest/playlists")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(PLAYLIST_BODY);

    const findArg = vi.mocked(prisma.playlist.findFirst).mock.calls[0]?.[0];
    // ownerId must be the authenticated user's ID, not a lookup-by-external-id-alone
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

  it("coverUploadId can be omitted — artworkUrl defaults to null", async () => {
    mockApiKey();
    mockPlaylistSlugLookup();
    vi.mocked(prisma.playlist.create).mockResolvedValue(MOCK_PLAYLIST_ROW as any);

    await request(app)
      .post("/api/v1/ingest/playlists")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(PLAYLIST_BODY); // no coverUploadId

    const createArg = vi.mocked(prisma.playlist.create).mock.calls[0][0];
    expect(createArg.data.coverArtUrl).toBeNull();
    // uploadAsset was never queried
    expect(vi.mocked(prisma.uploadAsset.findFirst)).not.toHaveBeenCalled();
  });
});

// ── recording ingest ──────────────────────────────────────────────────────────

describe("POST /api/v1/ingest/recordings", () => {
  function mockSuccessfulCreate() {
    mockApiKey();
    // audio asset lookup
    vi.mocked(prisma.uploadAsset.findFirst).mockResolvedValue(AUDIO_ASSET as any);
    // playlist lookup by externalId
    vi.mocked(prisma.playlist.findFirst).mockResolvedValue({
      id: "pl-1", status: "DRAFT", visibility: "PRIVATE",
    } as any);
    // existing recording lookup → not found (create path)
    vi.mocked(prisma.recording.findFirst).mockResolvedValue(null);
    // transaction
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      vi.mocked(prisma.playlistItem.aggregate).mockResolvedValue({ _max: { position: 0 } } as any);
      vi.mocked(prisma.playlistItem.create).mockResolvedValue({} as any);
      vi.mocked(prisma.recording.create).mockResolvedValue(MOCK_RECORDING_ROW as any);
      return fn({
        recording: { create: vi.mocked(prisma.recording.create) },
        playlistItem: {
          aggregate: vi.mocked(prisma.playlistItem.aggregate),
          create: vi.mocked(prisma.playlistItem.create),
        },
      });
    });
    // syncPlaylistStats
    vi.mocked(prisma.playlistItem.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.playlist.update).mockResolvedValue({} as any);
  }

  it("creates a new recording and returns created: true", async () => {
    mockSuccessfulCreate();

    const res = await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(RECORDING_BODY);

    expect(res.status).toBe(201);
    expect(res.body.created).toBe(true);
    expect(res.body.recording.id).toBe("rec-1");
  });

  it("uploaderId in the response is always the authenticated user's ID", async () => {
    mockSuccessfulCreate();

    const res = await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(RECORDING_BODY);

    expect(res.status).toBe(201);
    // Prove the returned uploaderId is from auth context, not anything the caller could inject
    expect(res.body.recording.uploaderId).toBe(MOCK_USER.id);
  });

  it("rejects requests that include uploaderId in the body (additionalProperties: false)", async () => {
    mockApiKey();
    // OpenAPI validator should reject this before the route runs
    const res = await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send({ ...RECORDING_BODY, uploaderId: "attacker-id" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when audioUploadId has kind=image", async () => {
    mockApiKey();
    vi.mocked(prisma.uploadAsset.findFirst).mockResolvedValue(IMAGE_ASSET as any);

    const res = await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send({ ...RECORDING_BODY, audioUploadId: IMAGE_ASSET.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("upload_kind_mismatch");
  });

  it("returns 403 when audioUploadId belongs to a different user", async () => {
    mockApiKey();
    vi.mocked(prisma.uploadAsset.findFirst).mockResolvedValue({
      ...AUDIO_ASSET, userId: OTHER_USER_ID,
    } as any);

    const res = await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(RECORDING_BODY);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("upload_forbidden");
  });

  it("returns 404 when the target playlist is not found for this user", async () => {
    mockApiKey();
    vi.mocked(prisma.uploadAsset.findFirst).mockResolvedValue(AUDIO_ASSET as any);
    vi.mocked(prisma.playlist.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send({ ...RECORDING_BODY, playlistExternalId: "nonexistent" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("playlist_not_found");
  });

  it("updates existing recording and returns created: false", async () => {
    mockApiKey();
    vi.mocked(prisma.uploadAsset.findFirst).mockResolvedValue(AUDIO_ASSET as any);
    vi.mocked(prisma.playlist.findFirst).mockResolvedValue({
      id: "pl-1", status: "DRAFT", visibility: "PRIVATE",
    } as any);
    vi.mocked(prisma.recording.findFirst).mockResolvedValue(MOCK_RECORDING_ROW as any);
    vi.mocked(prisma.recording.update).mockResolvedValue(MOCK_RECORDING_ROW as any);
    vi.mocked(prisma.playlistItem.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.playlist.update).mockResolvedValue({} as any);

    const res = await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send({ ...RECORDING_BODY, title: "Neon Window (remaster)" });

    expect(res.status).toBe(200);
    expect(res.body.created).toBe(false);
    expect(vi.mocked(prisma.recording.create)).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.$transaction)).not.toHaveBeenCalled();
  });
});

// ── idempotency + scoping (recording) ────────────────────────────────────────

describe("recording ingest — idempotency and scoping", () => {
  it("upserting the same externalId twice returns created: false on the second call", async () => {
    mockApiKey();
    vi.mocked(prisma.uploadAsset.findFirst).mockResolvedValue(AUDIO_ASSET as any);
    vi.mocked(prisma.playlist.findFirst).mockResolvedValue({
      id: "pl-1", status: "DRAFT", visibility: "PRIVATE",
    } as any);
    vi.mocked(prisma.recording.findFirst).mockResolvedValue(MOCK_RECORDING_ROW as any);
    vi.mocked(prisma.recording.update).mockResolvedValue(MOCK_RECORDING_ROW as any);
    vi.mocked(prisma.playlistItem.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.playlist.update).mockResolvedValue({} as any);

    const res = await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(RECORDING_BODY);

    expect(res.status).toBe(200);
    expect(res.body.created).toBe(false);
  });

  it("update path does not create a second PlaylistItem", async () => {
    mockApiKey();
    vi.mocked(prisma.uploadAsset.findFirst).mockResolvedValue(AUDIO_ASSET as any);
    vi.mocked(prisma.playlist.findFirst).mockResolvedValue({
      id: "pl-1", status: "DRAFT", visibility: "PRIVATE",
    } as any);
    vi.mocked(prisma.recording.findFirst).mockResolvedValue(MOCK_RECORDING_ROW as any);
    vi.mocked(prisma.recording.update).mockResolvedValue(MOCK_RECORDING_ROW as any);
    vi.mocked(prisma.playlistItem.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.playlist.update).mockResolvedValue({} as any);

    await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(RECORDING_BODY);

    // $transaction (which creates the PlaylistItem) must never run on updates
    expect(vi.mocked(prisma.$transaction)).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.playlistItem.create)).not.toHaveBeenCalled();
  });

  it("playlist lookup is owner-scoped — playlist with same externalId for another user returns 404", async () => {
    mockApiKey();
    vi.mocked(prisma.uploadAsset.findFirst).mockResolvedValue(AUDIO_ASSET as any);
    // Playlist exists in DB but our query scopes by ownerId=auth.user.id → returns null
    vi.mocked(prisma.playlist.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(RECORDING_BODY);

    expect(res.status).toBe(404);
    // Verify the query included the authenticated user's ID
    const findArg = vi.mocked(prisma.playlist.findFirst).mock.calls[0]?.[0];
    expect(findArg?.where).toMatchObject({ ownerId: MOCK_USER.id });
  });

  it("coverUploadId can be omitted — artworkUrl defaults to null", async () => {
    mockApiKey();
    vi.mocked(prisma.uploadAsset.findFirst).mockResolvedValue(AUDIO_ASSET as any);
    vi.mocked(prisma.playlist.findFirst).mockResolvedValue({
      id: "pl-1", status: "DRAFT", visibility: "PRIVATE",
    } as any);
    vi.mocked(prisma.recording.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      vi.mocked(prisma.playlistItem.aggregate).mockResolvedValue({ _max: { position: 0 } } as any);
      vi.mocked(prisma.playlistItem.create).mockResolvedValue({} as any);
      vi.mocked(prisma.recording.create).mockResolvedValue(MOCK_RECORDING_ROW as any);
      return fn({
        recording: { create: vi.mocked(prisma.recording.create) },
        playlistItem: {
          aggregate: vi.mocked(prisma.playlistItem.aggregate),
          create: vi.mocked(prisma.playlistItem.create),
        },
      });
    });
    vi.mocked(prisma.playlistItem.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.playlist.update).mockResolvedValue({} as any);

    await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(RECORDING_BODY); // no coverUploadId

    const createArg = vi.mocked(prisma.recording.create).mock.calls[0][0];
    expect(createArg.data.artworkUrl).toBeNull();
    // Only one uploadAsset lookup (for audio), not two
    expect(vi.mocked(prisma.uploadAsset.findFirst)).toHaveBeenCalledTimes(1);
  });

  it("rejects missing externalSource (OpenAPI required field)", async () => {
    mockApiKey();
    const res = await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send({ externalId: "track-01", playlistExternalId: "pl-x", title: "T", audioUploadId: "upl_x" });

    expect(res.status).toBe(400);
  });

  it("rejects missing externalId (OpenAPI required field)", async () => {
    mockApiKey();
    const res = await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send({ externalSource: "desktop-sync", playlistExternalId: "pl-x", title: "T", audioUploadId: "upl_x" });

    expect(res.status).toBe(400);
  });
});
