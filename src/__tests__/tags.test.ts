import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    tag: { findMany: vi.fn() },
  },
}));

import { prisma } from "../lib/prisma.js";
import { createApp } from "../app.js";

const app = createApp();

const PUBLIC_RECORDING = { visibility: "PUBLIC", status: "PUBLISHED" };

describe("GET /api/v1/tags/genres", () => {
  beforeEach(() => {
    vi.mocked(prisma.tag.findMany).mockResolvedValue([]);
  });

  it("returns all genre tags regardless of public catalog usage", async () => {
    vi.mocked(prisma.tag.findMany).mockResolvedValue([
      {
        id: "tag-ambient",
        name: "Ambient",
        slug: "ambient",
        kind: "GENRE",
        createdAt: new Date("2024-01-01"),
        _count: { recordingTags: 0 },
      },
      {
        id: "tag-jazz",
        name: "Jazz",
        slug: "jazz",
        kind: "GENRE",
        createdAt: new Date("2024-01-01"),
        _count: { recordingTags: 2 },
      },
    ] as never);

    const res = await request(app).get("/api/v1/tags/genres");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [
        { id: "tag-ambient", name: "Ambient", slug: "ambient", songCount: 0 },
        { id: "tag-jazz", name: "Jazz", slug: "jazz", songCount: 2 },
      ],
    });
    expect(prisma.tag.findMany).toHaveBeenCalledWith({
      where: { kind: "GENRE" },
      include: {
        _count: {
          select: {
            recordingTags: {
              where: {
                recording: PUBLIC_RECORDING,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });
  });
});
