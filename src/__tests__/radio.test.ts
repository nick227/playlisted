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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.recording.findMany).mockResolvedValue([]);
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
});
