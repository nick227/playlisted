import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import path from "node:path";
import { fileURLToPath } from "node:url";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    apiKey: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    uploadAsset: {
      create: vi.fn(),
    },
  },
}));

// Stub fs.unlink so cleanup calls in the route don't fail in tests
vi.mock("node:fs/promises", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:fs/promises")>();
  return { ...real, unlink: vi.fn().mockResolvedValue(undefined) };
});

import { prisma } from "../lib/prisma.js";
import { createApp } from "../app.js";
import { generateApiKey, hashApiKey } from "../lib/apiKeyAuth.js";

const app = createApp();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// A tiny valid MP3 fixture — 3 bytes is enough for content type tests since
// we trust the MIME type reported by multer (from the Content-Type header),
// not magic bytes. For real file validation add a magic-number check later.
const FIXTURE_DIR = path.join(__dirname, "fixtures");

const MOCK_USER = {
  id: "user-1",
  email: "test@example.com",
  username: "testuser",
  displayName: "Test User",
  role: "CREATOR" as const,
  status: "ACTIVE" as const,
  isFeaturedArtist: false,
  bio: null,
  avatarUrl: null,
  heroImageUrl: null,
  passwordHash: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const RAW_KEY = generateApiKey();
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);
const MOCK_KEY_ROW = {
  id: "key-1",
  userId: MOCK_USER.id,
  name: "Test Key",
  keyHash: hashApiKey(RAW_KEY),
  prefix: "plt_abc123",
  lastUsedAt: null,
  revokedAt: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  user: MOCK_USER,
};

function mockApiKey() {
  vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(MOCK_KEY_ROW as any);
  vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);
  vi.mocked(prisma.uploadAsset.create).mockResolvedValue({} as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);
  vi.mocked(prisma.uploadAsset.create).mockResolvedValue({} as any);
});

// ── helpers ───────────────────────────────────────────────────────────────────

function uploadAudio(filename = "track.mp3", mimeType = "audio/mpeg") {
  return request(app)
    .post("/api/v1/ingest/uploads?kind=audio")
    .set("Authorization", `Bearer ${RAW_KEY}`)
    .attach("file", Buffer.from("fake-audio-data"), { filename, contentType: mimeType });
}

function uploadImage(filename = "cover.jpg", mimeType = "image/jpeg") {
  return request(app)
    .post("/api/v1/ingest/uploads?kind=image")
    .set("Authorization", `Bearer ${RAW_KEY}`)
    .attach("file", TINY_PNG, { filename, contentType: mimeType });
}

// ── auth ──────────────────────────────────────────────────────────────────────

describe("authentication", () => {
  it("rejects requests with no Authorization header", async () => {
    const res = await request(app)
      .post("/api/v1/ingest/uploads?kind=audio")
      .attach("file", Buffer.from("x"), { filename: "f.mp3", contentType: "audio/mpeg" });

    expect(res.status).toBe(401);
  });

  it("rejects session tokens (non-plt_ bearer)", async () => {
    const res = await request(app)
      .post("/api/v1/ingest/uploads?kind=audio")
      .set("Authorization", "Bearer session-token-without-prefix")
      .attach("file", Buffer.from("x"), { filename: "f.mp3", contentType: "audio/mpeg" });

    expect(res.status).toBe(401);
  });

  it("updates lastUsedAt on the API key for successful uploads", async () => {
    mockApiKey();
    await uploadAudio();
    expect(vi.mocked(prisma.apiKey.update)).toHaveBeenCalledWith(
      expect.objectContaining({ data: { lastUsedAt: expect.any(Date) } }),
    );
  });
});

// ── allowlist ─────────────────────────────────────────────────────────────────

describe("MIME + extension allowlist", () => {
  it("accepts audio/mpeg + .mp3", async () => {
    mockApiKey();
    const res = await uploadAudio("track.mp3", "audio/mpeg");
    expect(res.status).toBe(201);
  });

  it("accepts image/jpeg + .jpg", async () => {
    mockApiKey();
    const res = await uploadImage("cover.jpg", "image/jpeg");
    expect(res.status).toBe(201);
  });

  it("accepts image/png + .png", async () => {
    mockApiKey();
    const res = await uploadImage("cover.png", "image/png");
    expect(res.status).toBe(201);
  });

  it("rejects audio/mpeg with a .exe extension → 415", async () => {
    mockApiKey();
    const res = await request(app)
      .post("/api/v1/ingest/uploads?kind=audio")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .attach("file", Buffer.from("x"), { filename: "evil.exe", contentType: "audio/mpeg" });

    expect(res.status).toBe(415);
    expect(res.body.error).toBe("unsupported_media_type");
  });

  it("rejects image/gif (not in allowlist) → 415", async () => {
    mockApiKey();
    const res = await request(app)
      .post("/api/v1/ingest/uploads?kind=image")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .attach("file", Buffer.from("x"), { filename: "anim.gif", contentType: "image/gif" });

    expect(res.status).toBe(415);
  });

  it("rejects application/octet-stream for audio → 415", async () => {
    mockApiKey();
    const res = await request(app)
      .post("/api/v1/ingest/uploads?kind=audio")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .attach("file", Buffer.from("x"), { filename: "file.mp3", contentType: "application/octet-stream" });

    expect(res.status).toBe(415);
  });
});

// ── response shape ────────────────────────────────────────────────────────────

describe("response shape", () => {
  it("returns uploadId, url, kind, mimeType, bytes, originalName", async () => {
    mockApiKey();
    const res = await uploadAudio("my track.mp3", "audio/mpeg");

    expect(res.status).toBe(201);
    expect(res.body.uploadId).toMatch(/^upl_[0-9a-f]{32}$/);
    expect(res.body.url).toBeTruthy();
    expect(res.body.kind).toBe("audio");
    expect(res.body.mimeType).toBe("audio/mpeg");
    expect(typeof res.body.bytes).toBe("number");
    expect(res.body.originalName).toBeDefined();
  });

  it("never exposes uploadedBy in the response", async () => {
    mockApiKey();
    const res = await uploadAudio();
    expect(res.body).not.toHaveProperty("uploadedBy");
  });

  it("uploadId is written to the DB with userId from auth context, not request body", async () => {
    mockApiKey();
    await uploadAudio();

    const createCall = vi.mocked(prisma.uploadAsset.create).mock.calls[0][0];
    expect(createCall.data.userId).toBe(MOCK_USER.id);
    expect(createCall.data.id).toMatch(/^upl_/);
  });

  it("url is a served path, not a filesystem path", async () => {
    mockApiKey();
    const res = await uploadAudio();

    expect(res.body.url).not.toMatch(/[A-Z]:\\/); // no Windows drive letters
    expect(res.body.url).not.toMatch(/^\/home\//); // no Unix absolute paths
    expect(res.body.url).toMatch(/^(https?:\/\/|\/uploads\/)/); // relative or absolute URL
  });
});

// ── missing inputs ────────────────────────────────────────────────────────────

describe("input validation", () => {
  it("returns 400 when kind is missing", async () => {
    mockApiKey();
    const res = await request(app)
      .post("/api/v1/ingest/uploads")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .attach("file", Buffer.from("x"), { filename: "f.mp3", contentType: "audio/mpeg" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when kind is invalid", async () => {
    mockApiKey();
    const res = await request(app)
      .post("/api/v1/ingest/uploads?kind=video")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .attach("file", Buffer.from("x"), { filename: "f.mp4", contentType: "video/mp4" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_kind");
  });

  it("returns 400 when no file field is included in multipart body", async () => {
    mockApiKey();
    // Send a valid multipart body with an irrelevant field — multer parses it fine
    // but req.file is undefined, which the route handles as file_required
    const res = await request(app)
      .post("/api/v1/ingest/uploads?kind=audio")
      .set("Authorization", `Bearer ${RAW_KEY}`)
      .field("other", "ignored");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("file_required");
  });
});
