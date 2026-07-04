import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    playlist: { findMany: vi.fn() },
    recording: { findMany: vi.fn() },
  },
}));

import { prisma } from "../lib/prisma.js";
import { listUserLibraryImages } from "../lib/visualMedia/listUserLibraryImages.js";

describe("listUserLibraryImages", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.playlist.findMany).mockReset();
    vi.mocked(prisma.recording.findMany).mockReset();
  });

  it("collects avatar, hero, playlist covers, and track artwork with dedupe", async () => {
    const updatedAt = new Date("2026-01-15T12:00:00.000Z");

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      avatarUrl: "/uploads/images/avatar.jpg",
      heroImageUrl: "/uploads/images/hero.jpg",
      updatedAt,
    } as never);

    vi.mocked(prisma.playlist.findMany).mockResolvedValue([
      {
        title: "Night Drive",
        coverArtUrl: "/uploads/images/night-drive-cover.jpg",
        updatedAt: new Date("2026-01-20T12:00:00.000Z"),
      },
      {
        title: "Shared Cover",
        coverArtUrl: "/uploads/images/shared-cover.jpg",
        updatedAt: new Date("2026-01-10T12:00:00.000Z"),
      },
    ] as never);

    vi.mocked(prisma.recording.findMany).mockResolvedValue([
      {
        title: "Signal Bloom",
        artworkUrl: "/uploads/images/signal-bloom-art.jpg",
        updatedAt: new Date("2026-01-18T12:00:00.000Z"),
      },
      {
        title: "Duplicate Cover",
        artworkUrl: "/uploads/images/shared-cover.jpg",
        updatedAt: new Date("2026-01-05T12:00:00.000Z"),
      },
    ] as never);

    const items = await listUserLibraryImages("user-1");

    expect(items).toHaveLength(5);
    expect(items.map((item) => item.url)).toEqual([
      "/uploads/images/night-drive-cover.jpg",
      "/uploads/images/signal-bloom-art.jpg",
      "/uploads/images/avatar.jpg",
      "/uploads/images/hero.jpg",
      "/uploads/images/shared-cover.jpg",
    ]);
    expect(items[0]).toMatchObject({
      label: "Night Drive cover",
      source: "playlist",
    });
    expect(items.find((item) => item.source === "recording")).toMatchObject({
      label: "Signal Bloom artwork",
    });
  });

  it("returns an empty list when the user has no uploaded images", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      avatarUrl: null,
      heroImageUrl: null,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    } as never);
    vi.mocked(prisma.playlist.findMany).mockResolvedValue([]);
    vi.mocked(prisma.recording.findMany).mockResolvedValue([]);

    await expect(listUserLibraryImages("user-1")).resolves.toEqual([]);
  });
});
