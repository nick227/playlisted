import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    recording: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    session: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "../lib/prisma.js";
import { createApp } from "../app.js";

const app = createApp();

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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.recording.findMany).mockResolvedValue([]);
  vi.mocked(prisma.session.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.session.update).mockResolvedValue({} as never);
});

describe("radio public API", () => {
  it("returns now-playing state without an API key or session", async () => {
    const res = await request(app).get("/api/v1/radio");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      slug: "main",
      name: "Playlisted Radio",
      status: "OFFLINE",
      listenerCount: 0,
      nowPlaying: null,
    });
  });

  it("accepts anonymous listener heartbeats without an API key", async () => {
    const res = await request(app)
      .post("/api/v1/radio/listeners/heartbeat")
      .send({ listenerId: "listener-1" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      listenerId: "listener-1",
      station: "main",
      listenerCount: expect.any(Number),
    });
  });

  it("accepts anonymous radio chat messages and returns them with radio state", async () => {
    const sent = await request(app)
      .post("/api/v1/radio/chat")
      .send({
        listenerId: "listener-chat-1",
        displayName: "Casey",
        message: "hello radio",
      });

    expect(sent.status).toBe(201);
    expect(sent.body).toMatchObject({
      listenerId: "listener-chat-1",
      displayName: "Casey",
      message: "hello radio",
    });

    const state = await request(app).get("/api/v1/radio");

    expect(state.status).toBe(200);
    expect(state.body.chatMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          displayName: "Casey",
          message: "hello radio",
        }),
      ]),
    );
  });

  it("uses the authenticated member display name instead of a spoofed client value", async () => {
    vi.mocked(prisma.session.findFirst).mockResolvedValue(MOCK_SESSION as never);

    const sent = await request(app)
      .post("/api/v1/radio/chat")
      .set("Authorization", "Bearer session-token")
      .send({
        listenerId: "listener-chat-2",
        displayName: "Fake Admin",
        message: "signed in chat",
      });

    expect(sent.status).toBe(201);
    expect(sent.body).toMatchObject({
      listenerId: "listener-chat-2",
      displayName: "Test User",
      avatarUrl: null,
      message: "signed in chat",
    });
  });
});
