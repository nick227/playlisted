import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    apiKey: { findFirst: vi.fn(), update: vi.fn() },
    uploadAsset: { findUnique: vi.fn() },
    playlist: { findFirst: vi.fn(), update: vi.fn() },
    recording: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    recordingSubtitle: { create: vi.fn(), upsert: vi.fn(), count: vi.fn() },
    playlistItem: { aggregate: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
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

const MOCK_RECORDING_ROW = {
  id: "rec-1", uploaderId: MOCK_USER.id, publishedPlaylistId: "pl-1",
  title: "Neon Window", description: null, audioUrl: "/uploads/audio/track.mp3",
  audioMimeType: "audio/mpeg", audioBytes: BigInt(1024), durationSeconds: null,
  artworkUrl: null, trackNumber: 1, recordingType: "SONG", visibility: "PRIVATE",
  status: "DRAFT", externalSource: "desktop-sync", externalId: "track-01",
  createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-01"),
};

const MOCK_PLAYLIST = { id: "pl-1", status: "DRAFT", visibility: "PRIVATE" };

function mockApiKey() {
  vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(MOCK_KEY as any);
  vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);
}

function mockSuccessfulCreate() {
  mockApiKey();
  vi.mocked(prisma.uploadAsset.findUnique).mockResolvedValue(AUDIO_ASSET as any);
  vi.mocked(prisma.playlist.findFirst).mockResolvedValue(MOCK_PLAYLIST as any);
  vi.mocked(prisma.recording.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
    vi.mocked(prisma.playlistItem.aggregate).mockResolvedValue({ _max: { position: 0 } } as any);
    vi.mocked(prisma.playlistItem.create).mockResolvedValue({} as any);
    vi.mocked(prisma.recording.create).mockResolvedValue(MOCK_RECORDING_ROW as any);
    vi.mocked(prisma.recordingSubtitle.create).mockResolvedValue({} as any);
    return fn({
      recording: { create: vi.mocked(prisma.recording.create) },
      recordingSubtitle: { create: vi.mocked(prisma.recordingSubtitle.create) },
      playlistItem: {
        aggregate: vi.mocked(prisma.playlistItem.aggregate),
        create: vi.mocked(prisma.playlistItem.create),
      },
    });
  });
  vi.mocked(prisma.playlistItem.findMany).mockResolvedValue([] as any);
  vi.mocked(prisma.playlist.update).mockResolvedValue({} as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);
  vi.mocked(prisma.playlistItem.findMany).mockResolvedValue([] as any);
  vi.mocked(prisma.playlist.update).mockResolvedValue({} as any);
  vi.mocked(prisma.recordingSubtitle.count).mockResolvedValue(0 as any);
});

const RECORDING_BODY = {
  externalSource: "desktop-sync",
  externalId: "track-01",
  playlistExternalId: "album-night-signals",
  title: "Neon Window",
  audioUploadId: AUDIO_ASSET.id,
  trackNumber: 1,
};

describe("POST /api/v1/ingest/recordings", () => {
  it("creates a new recording and returns created: true", async () => {
    mockSuccessfulCreate();

    const res = await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(RECORDING_BODY);

    expect(res.status).toBe(201);
    expect(res.body.created).toBe(true);
    expect(res.body.recording.id).toBe("rec-1");
    expect(vi.mocked(prisma.recordingSubtitle.create)).toHaveBeenCalledWith({
      data: {
        recordingId: "rec-1",
        isActive: true,
        source: "MODAL",
        status: "QUEUED",
      },
    });
  });

  it("uploaderId in the response is always the authenticated user's ID", async () => {
    mockSuccessfulCreate();

    const res = await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(RECORDING_BODY);

    expect(res.status).toBe(201);
    expect(res.body.recording.uploaderId).toBe(MOCK_USER.id);
  });

  it("rejects requests that include uploaderId in the body (additionalProperties: false)", async () => {
    mockApiKey();
    const res = await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send({ ...RECORDING_BODY, uploaderId: "attacker-id" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when audioUploadId has kind=image", async () => {
    mockApiKey();
    vi.mocked(prisma.uploadAsset.findUnique).mockResolvedValue(IMAGE_ASSET as any);

    const res = await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send({ ...RECORDING_BODY, audioUploadId: IMAGE_ASSET.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("upload_kind_mismatch");
  });

  it("returns 403 when audioUploadId belongs to a different user", async () => {
    mockApiKey();
    vi.mocked(prisma.uploadAsset.findUnique).mockResolvedValue({
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
    vi.mocked(prisma.uploadAsset.findUnique).mockResolvedValue(AUDIO_ASSET as any);
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
    vi.mocked(prisma.uploadAsset.findUnique).mockResolvedValue(AUDIO_ASSET as any);
    vi.mocked(prisma.playlist.findFirst).mockResolvedValue(MOCK_PLAYLIST as any);
    vi.mocked(prisma.recording.findFirst).mockResolvedValue(MOCK_RECORDING_ROW as any);
    vi.mocked(prisma.recording.update).mockResolvedValue(MOCK_RECORDING_ROW as any);

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

describe("recording ingest — idempotency and scoping", () => {
  it("upserting the same externalId twice returns created: false on the second call", async () => {
    mockApiKey();
    vi.mocked(prisma.uploadAsset.findUnique).mockResolvedValue(AUDIO_ASSET as any);
    vi.mocked(prisma.playlist.findFirst).mockResolvedValue(MOCK_PLAYLIST as any);
    vi.mocked(prisma.recording.findFirst).mockResolvedValue(MOCK_RECORDING_ROW as any);
    vi.mocked(prisma.recording.update).mockResolvedValue(MOCK_RECORDING_ROW as any);

    const res = await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(RECORDING_BODY);

    expect(res.status).toBe(200);
    expect(res.body.created).toBe(false);
  });

  it("update path does not create a second PlaylistItem", async () => {
    mockApiKey();
    vi.mocked(prisma.uploadAsset.findUnique).mockResolvedValue(AUDIO_ASSET as any);
    vi.mocked(prisma.playlist.findFirst).mockResolvedValue(MOCK_PLAYLIST as any);
    vi.mocked(prisma.recording.findFirst).mockResolvedValue(MOCK_RECORDING_ROW as any);
    vi.mocked(prisma.recording.update).mockResolvedValue(MOCK_RECORDING_ROW as any);

    await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(RECORDING_BODY);

    expect(vi.mocked(prisma.$transaction)).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.playlistItem.create)).not.toHaveBeenCalled();
  });

  it("playlist lookup is owner-scoped — other user's playlist returns 404", async () => {
    mockApiKey();
    vi.mocked(prisma.uploadAsset.findUnique).mockResolvedValue(AUDIO_ASSET as any);
    vi.mocked(prisma.playlist.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(RECORDING_BODY);

    expect(res.status).toBe(404);
    const findArg = vi.mocked(prisma.playlist.findFirst).mock.calls[0]?.[0];
    expect(findArg?.where).toMatchObject({ ownerId: MOCK_USER.id });
  });

  it("coverUploadId can be omitted — artworkUrl defaults to null on create", async () => {
    mockSuccessfulCreate();

    await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(RECORDING_BODY);

    const createArg = vi.mocked(prisma.recording.create).mock.calls[0][0];
    expect(createArg.data.artworkUrl).toBeNull();
    expect(vi.mocked(prisma.uploadAsset.findUnique)).toHaveBeenCalledTimes(1);
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

describe("recording ingest — subtitle queue admission caps", () => {
  it("returns 429 when the account's queued-subtitle count is at the cap", async () => {
    mockApiKey();
    vi.mocked(prisma.uploadAsset.findUnique).mockResolvedValue(AUDIO_ASSET as any);
    vi.mocked(prisma.playlist.findFirst).mockResolvedValue(MOCK_PLAYLIST as any);
    vi.mocked(prisma.recording.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.recordingSubtitle.count)
      .mockResolvedValueOnce(10 as any) // per-account count, at SUBTITLES_MAX_QUEUED_PER_ACCOUNT default (10)
      .mockResolvedValueOnce(1 as any); // system-wide count, well under cap

    const res = await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(RECORDING_BODY);

    expect(res.status).toBe(429);
    expect(res.body.error).toBe("subtitle_queue_full");
    expect(vi.mocked(prisma.recording.create)).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.$transaction)).not.toHaveBeenCalled();
  });

  it("returns 429 when the system-wide queued-subtitle count is at the cap", async () => {
    mockApiKey();
    vi.mocked(prisma.uploadAsset.findUnique).mockResolvedValue(AUDIO_ASSET as any);
    vi.mocked(prisma.playlist.findFirst).mockResolvedValue(MOCK_PLAYLIST as any);
    vi.mocked(prisma.recording.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.recordingSubtitle.count)
      .mockResolvedValueOnce(2 as any) // per-account count, well under cap
      .mockResolvedValueOnce(50 as any); // system-wide count, at SUBTITLES_MAX_QUEUED_SYSTEM default (50)

    const res = await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(RECORDING_BODY);

    expect(res.status).toBe(429);
    expect(res.body.error).toBe("subtitle_queue_full");
    expect(vi.mocked(prisma.recording.create)).not.toHaveBeenCalled();
  });

  it("allows recording creation when both queue caps have headroom", async () => {
    mockSuccessfulCreate();
    vi.mocked(prisma.recordingSubtitle.count)
      .mockResolvedValueOnce(3 as any)
      .mockResolvedValueOnce(20 as any);

    const res = await request(app)
      .post("/api/v1/ingest/recordings")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .send(RECORDING_BODY);

    expect(res.status).toBe(201);
    expect(res.body.created).toBe(true);
  });
});
