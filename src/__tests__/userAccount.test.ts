import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

import {
  accountInactiveMessage,
  canViewerAccessUserProfile,
  isUserActive,
} from "../lib/publicUserFilter.js";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    session: { create: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock("../lib/auth.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/auth.js")>();
  return {
    ...actual,
    getAuthContextFromRequest: vi.fn().mockResolvedValue(null),
    hashPassword: vi.fn().mockResolvedValue("hash"),
    verifyPassword: vi.fn().mockResolvedValue(true),
    generateSessionToken: vi.fn().mockReturnValue("token"),
    hashSessionToken: vi.fn().mockReturnValue("hash"),
    getSessionExpiryDate: vi.fn().mockReturnValue(new Date("2099-01-01")),
  };
});

import { prisma } from "../lib/prisma.js";
import { createApp } from "../app.js";

const app = createApp();

describe("user account helpers", () => {
  it("treats only ACTIVE as active", () => {
    expect(isUserActive({ status: "ACTIVE" })).toBe(true);
    expect(isUserActive({ status: "SUSPENDED" })).toBe(false);
    expect(isUserActive({ status: "INVITED" })).toBe(false);
  });

  it("hides suspended profiles from anonymous viewers", () => {
    expect(canViewerAccessUserProfile({ id: "u1", status: "SUSPENDED" }, {}, "u1")).toBe(false);
    expect(canViewerAccessUserProfile({ id: "u1", status: "ACTIVE" }, {}, "u1")).toBe(true);
  });

  it("allows staff and the account owner to view restricted profiles", () => {
    const suspended = { id: "u1", status: "SUSPENDED" };
    expect(canViewerAccessUserProfile(suspended, { userId: "u1" }, "u1")).toBe(true);
    expect(canViewerAccessUserProfile(suspended, { role: "ADMIN" }, "u1")).toBe(true);
  });

  it("returns status-specific inactive messages", () => {
    expect(accountInactiveMessage("SUSPENDED")).toContain("suspended");
    expect(accountInactiveMessage("INVITED")).toContain("not active");
  });
});

describe("POST /api/v1/auth/login", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.session.create).mockReset();
  });

  it("rejects suspended accounts", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u1",
      email: "artist@example.com",
      passwordHash: "hash",
      status: "SUSPENDED",
    } as never);

    const res = await request(app).post("/api/v1/auth/login").send({
      email: "artist@example.com",
      password: "secretpass",
    });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("account_inactive");
    expect(prisma.session.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/users/by-username/:username", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
  });

  it("returns 404 for suspended profiles to anonymous viewers", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u1",
      username: "artist",
      email: "artist@example.com",
      displayName: "Artist",
      status: "SUSPENDED",
      role: "CREATOR",
      bio: null,
      avatarUrl: null,
      heroImageUrl: null,
      profileLinks: null,
      isFeaturedArtist: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ownedPlaylists: [],
    } as never);

    const res = await request(app).get("/api/v1/users/by-username/artist");
    expect(res.status).toBe(404);
  });
});
