import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Must be hoisted before any imports that pull in prisma
vi.mock("../lib/prisma.js", () => ({
  prisma: {
    session: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    apiKey: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "../lib/prisma.js";
import { createApp } from "../app.js";
import { generateApiKey, getApiKeyFromRequest } from "../lib/apiKeyAuth.js";

const app = createApp();

// ── shared fixtures ───────────────────────────────────────────────────────────

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

const MOCK_SESSION = {
  id: "session-1",
  userId: MOCK_USER.id,
  tokenHash: "irrelevant-hash",
  expiresAt: new Date(Date.now() + 86_400_000),
  lastUsedAt: null,
  revokedAt: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  user: MOCK_USER,
};

const SESSION_TOKEN = "any-valid-session-token";

const MOCK_KEY_ROW = {
  id: "key-1",
  userId: MOCK_USER.id,
  name: "My Script",
  keyHash: "stored-hash-never-raw",
  prefix: "plt_abc123",
  lastUsedAt: null,
  revokedAt: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

function mockSession() {
  vi.mocked(prisma.session.findFirst).mockResolvedValue(MOCK_SESSION as any);
  vi.mocked(prisma.session.update).mockResolvedValue(MOCK_SESSION as any);
}

// ── setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.session.update).mockResolvedValue({} as any);
  vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any);
  vi.mocked(prisma.apiKey.count).mockResolvedValue(0); // default: user has 0 active keys
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/v1/developer/keys — create", () => {
  it("returns the raw key exactly once in the response", async () => {
    mockSession();
    vi.mocked(prisma.apiKey.create).mockResolvedValue(MOCK_KEY_ROW as any);

    const res = await request(app)
      .post("/api/v1/developer/keys")
      .set("Authorization", `Bearer ${SESSION_TOKEN}`)
      .send({ name: "My Script" });

    expect(res.status).toBe(201);
    expect(res.body.key).toBeDefined();
    expect(res.body.key).toMatch(/^plt_[0-9a-f]{64}$/);
  });

  it("never stores the raw key — only the hash reaches prisma.create", async () => {
    mockSession();
    vi.mocked(prisma.apiKey.create).mockResolvedValue(MOCK_KEY_ROW as any);

    const res = await request(app)
      .post("/api/v1/developer/keys")
      .set("Authorization", `Bearer ${SESSION_TOKEN}`)
      .send({ name: "My Script" });

    const createArg = vi.mocked(prisma.apiKey.create).mock.calls[0][0];
    expect(createArg.data).not.toHaveProperty("key");
    expect(createArg.data.keyHash).not.toBe(res.body.key);
    // keyHash is a 64-char SHA-256 hex string
    expect(createArg.data.keyHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns 409 when the user already has 10 active keys", async () => {
    mockSession();
    vi.mocked(prisma.apiKey.count).mockResolvedValue(10);

    const res = await request(app)
      .post("/api/v1/developer/keys")
      .set("Authorization", `Bearer ${SESSION_TOKEN}`)
      .send({ name: "One Too Many" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("key_limit_reached");
    expect(vi.mocked(prisma.apiKey.create)).not.toHaveBeenCalled();
  });

  it("returns 400 when name is blank", async () => {
    mockSession();

    const res = await request(app)
      .post("/api/v1/developer/keys")
      .set("Authorization", `Bearer ${SESSION_TOKEN}`)
      .send({ name: "   " });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_name");
    expect(vi.mocked(prisma.apiKey.create)).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/developer/keys — list", () => {
  it("never includes raw key or keyHash in any listed item", async () => {
    mockSession();
    vi.mocked(prisma.apiKey.findMany).mockResolvedValue([MOCK_KEY_ROW] as any);

    const res = await request(app)
      .get("/api/v1/developer/keys")
      .set("Authorization", `Bearer ${SESSION_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.keys)).toBe(true);
    for (const item of res.body.keys as Record<string, unknown>[]) {
      expect(item).not.toHaveProperty("key");
      expect(item).not.toHaveProperty("keyHash");
    }
  });
});

describe("DELETE /api/v1/developer/keys/:keyId — revoke", () => {
  it("revokes a key owned by the current user and returns 204", async () => {
    mockSession();
    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(MOCK_KEY_ROW as any);

    const res = await request(app)
      .delete("/api/v1/developer/keys/key-1")
      .set("Authorization", `Bearer ${SESSION_TOKEN}`);

    expect(res.status).toBe(204);
    expect(vi.mocked(prisma.apiKey.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "key-1" },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      }),
    );
  });

  it("returns 404 when the key belongs to a different user", async () => {
    mockSession();
    // findFirst returns null because ownerId !== auth.user.id
    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/v1/developer/keys/key-other-user")
      .set("Authorization", `Bearer ${SESSION_TOKEN}`);

    expect(res.status).toBe(404);
    expect(vi.mocked(prisma.apiKey.update)).not.toHaveBeenCalled();
  });
});

describe("getApiKeyFromRequest — authentication", () => {
  it("returns null for a revoked key (DB query with revokedAt: null returns nothing)", async () => {
    // DB row is absent because the query filters revokedAt: null
    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(null);

    const rawKey = generateApiKey();
    const ctx = await getApiKeyFromRequest({
      headers: { authorization: `Bearer ${rawKey}` },
    });

    expect(ctx).toBeNull();
    // lastUsedAt must never be updated for a failed auth
    expect(vi.mocked(prisma.apiKey.update)).not.toHaveBeenCalled();
  });

  it("returns user context and updates lastUsedAt for a valid active key", async () => {
    const rawKey = generateApiKey();
    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue({
      ...MOCK_KEY_ROW,
      user: MOCK_USER,
    } as any);

    const ctx = await getApiKeyFromRequest({
      headers: { authorization: `Bearer ${rawKey}` },
    });

    expect(ctx).not.toBeNull();
    expect(ctx!.user.id).toBe(MOCK_USER.id);
    expect(vi.mocked(prisma.apiKey.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: MOCK_KEY_ROW.id },
        data: { lastUsedAt: expect.any(Date) },
      }),
    );
  });

  it("ignores non-plt_ bearer tokens (session tokens passthrough, no DB hit)", async () => {
    const ctx = await getApiKeyFromRequest({
      headers: { authorization: "Bearer session-token-no-prefix" },
    });

    expect(ctx).toBeNull();
    expect(vi.mocked(prisma.apiKey.findFirst)).not.toHaveBeenCalled();
  });
});
