import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

import {
  canViewerAccessRecording,
  filterPlaylistItemsForViewer,
  isRecordingBrowsable,
  isRecordingLinkAccessible,
} from "../lib/publicRecordingFilter.js";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    recording: { findUnique: vi.fn() },
  },
}));

vi.mock("../lib/auth.js", () => ({
  getAuthContextFromRequest: vi.fn().mockResolvedValue(null),
}));

import { prisma } from "../lib/prisma.js";
import { createApp } from "../app.js";

const app = createApp();

const PUBLIC_PUBLISHED = { visibility: "PUBLIC", status: "PUBLISHED" };
const PRIVATE_PUBLISHED = { visibility: "PRIVATE", status: "PUBLISHED" };
const UNLISTED_PUBLISHED = { visibility: "UNLISTED", status: "PUBLISHED" };

describe("recording visibility helpers", () => {
  it("treats only PUBLIC+PUBLISHED as browsable", () => {
    expect(isRecordingBrowsable(PUBLIC_PUBLISHED)).toBe(true);
    expect(isRecordingBrowsable(PRIVATE_PUBLISHED)).toBe(false);
    expect(isRecordingBrowsable(UNLISTED_PUBLISHED)).toBe(false);
    expect(isRecordingBrowsable({ visibility: "PUBLIC", status: "DRAFT" })).toBe(false);
  });

  it("allows link access for PUBLIC or UNLISTED when published", () => {
    expect(isRecordingLinkAccessible(PUBLIC_PUBLISHED)).toBe(true);
    expect(isRecordingLinkAccessible(UNLISTED_PUBLISHED)).toBe(true);
    expect(isRecordingLinkAccessible(PRIVATE_PUBLISHED)).toBe(false);
  });

  it("blocks anonymous viewers from private recordings", () => {
    expect(canViewerAccessRecording(PRIVATE_PUBLISHED, {}, "uploader-1")).toBe(false);
    expect(canViewerAccessRecording(PUBLIC_PUBLISHED, {}, "uploader-1")).toBe(true);
  });

  it("allows owners and staff to see restricted recordings", () => {
    expect(canViewerAccessRecording(PRIVATE_PUBLISHED, { userId: "uploader-1" }, "uploader-1")).toBe(true);
    expect(canViewerAccessRecording(PRIVATE_PUBLISHED, { role: "ADMIN" }, "uploader-1")).toBe(true);
  });

  it("filters private tracks from public playlist responses", () => {
    const items = [
      { recording: PUBLIC_PUBLISHED },
      { recording: PRIVATE_PUBLISHED },
    ];
    const filtered = filterPlaylistItemsForViewer(items, {}, "owner-1");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].recording.visibility).toBe("PUBLIC");
  });
});

describe("GET /api/v1/recordings/:recordingId", () => {
  beforeEach(() => {
    vi.mocked(prisma.recording.findUnique).mockReset();
  });

  it("returns 404 for private recordings to anonymous viewers", async () => {
    vi.mocked(prisma.recording.findUnique).mockResolvedValue({
      id: "rec-private",
      uploaderId: "user-1",
      visibility: "PRIVATE",
      status: "PUBLISHED",
      uploader: { id: "user-1", username: "a", displayName: "A", avatarUrl: null, heroImageUrl: null, role: "ARTIST" },
      publishedPlaylist: {
        id: "pl-1",
        ownerId: "user-1",
        title: "Album",
        slug: "album",
        type: "ALBUM",
        visibility: "PUBLIC",
        status: "PUBLISHED",
      },
    } as never);

    const res = await request(app).get("/api/v1/recordings/rec-private");
    expect(res.status).toBe(404);
  });
});
