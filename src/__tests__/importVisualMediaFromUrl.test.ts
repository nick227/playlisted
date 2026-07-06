import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    visualMediaAsset: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("../lib/visualMedia/userOwnsUploadUrl.js", () => ({
  userOwnsUploadUrl: vi.fn(),
}));

vi.mock("../lib/visualMedia/readStoredUploadMetadata.js", () => ({
  readStoredUploadMetadata: vi.fn(),
}));

import { prisma } from "../lib/prisma.js";
import { importVisualMediaFromUrl } from "../lib/visualMedia/importVisualMediaFromUrl.js";
import { readStoredUploadMetadata } from "../lib/visualMedia/readStoredUploadMetadata.js";
import { userOwnsUploadUrl } from "../lib/visualMedia/userOwnsUploadUrl.js";

describe("importVisualMediaFromUrl", () => {
  beforeEach(() => {
    vi.mocked(prisma.visualMediaAsset.findMany).mockReset();
    vi.mocked(prisma.visualMediaAsset.create).mockReset();
    vi.mocked(userOwnsUploadUrl).mockReset();
    vi.mocked(readStoredUploadMetadata).mockReset();
  });

  it("returns an existing asset for the same normalized upload URL", async () => {
    vi.mocked(prisma.visualMediaAsset.findMany).mockResolvedValue([
      {
        id: "asset-1",
        ownerId: "user-1",
        mediaType: "IMAGE",
        storageKey: null,
        url: "/uploads/images/art.jpg",
        thumbnailUrl: "/uploads/images/art.jpg",
        originalName: "art.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        durationMs: null,
        width: null,
        height: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as never);

    const asset = await importVisualMediaFromUrl("user-1", {
      url: "https://playlisted.test/uploads/images/art.jpg",
      originalName: "Track artwork",
      kind: "image",
    });

    expect(asset.id).toBe("asset-1");
    expect(prisma.visualMediaAsset.create).not.toHaveBeenCalled();
    expect(userOwnsUploadUrl).not.toHaveBeenCalled();
  });

  it("links an owned library upload without creating a new stored file", async () => {
    vi.mocked(prisma.visualMediaAsset.findMany).mockResolvedValue([]);
    vi.mocked(userOwnsUploadUrl).mockResolvedValue(true);
    vi.mocked(readStoredUploadMetadata).mockResolvedValue({
      sizeBytes: 2048,
      mimeType: "image/jpeg",
    });
    vi.mocked(prisma.visualMediaAsset.create).mockResolvedValue({
      id: "asset-2",
      ownerId: "user-1",
      mediaType: "IMAGE",
      storageKey: null,
      url: "/uploads/images/art.jpg",
      thumbnailUrl: "/uploads/images/art.jpg",
      originalName: "Track artwork",
      mimeType: "image/jpeg",
      sizeBytes: 2048,
      durationMs: null,
      width: null,
      height: null,
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
    } as never);

    const asset = await importVisualMediaFromUrl("user-1", {
      url: "/uploads/images/art.jpg",
      originalName: "Track artwork",
      kind: "image",
    });

    expect(asset.id).toBe("asset-2");
    expect(prisma.visualMediaAsset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        storageKey: null,
        url: "/uploads/images/art.jpg",
        thumbnailUrl: "/uploads/images/art.jpg",
      }),
    });
  });

  it("rejects uploads the user does not own", async () => {
    vi.mocked(prisma.visualMediaAsset.findMany).mockResolvedValue([]);
    vi.mocked(userOwnsUploadUrl).mockResolvedValue(false);

    await expect(
      importVisualMediaFromUrl("user-1", {
        url: "/uploads/images/stranger.jpg",
        originalName: "Nope",
        kind: "image",
      }),
    ).rejects.toThrow("import_url_not_owned");
  });
});
