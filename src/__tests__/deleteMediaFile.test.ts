import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs/promises", () => ({
  default: { unlink: vi.fn().mockResolvedValue(undefined) },
}));

import fs from "node:fs/promises";

import { deleteMediaUrl, mediaUrlToRelativePath } from "../lib/deleteMediaFile.js";

describe("mediaUrlToRelativePath", () => {
  beforeEach(() => {
    delete process.env.MEDIA_BASE_URL;
  });

  it("parses relative upload URLs", () => {
    expect(mediaUrlToRelativePath("/uploads/audio/track-abc123.mp3")).toBe("audio/track-abc123.mp3");
    expect(mediaUrlToRelativePath("/uploads/images/cover-def456.jpg")).toBe("images/cover-def456.jpg");
  });

  it("parses MEDIA_BASE_URL absolute URLs", () => {
    process.env.MEDIA_BASE_URL = "https://cdn.example.com";
    expect(mediaUrlToRelativePath("https://cdn.example.com/audio/track.mp3")).toBe("audio/track.mp3");
  });

  it("returns null for external URLs", () => {
    expect(mediaUrlToRelativePath("https://other-cdn.example.com/audio/track.mp3")).toBeNull();
  });
});

describe("deleteMediaUrl", () => {
  beforeEach(() => {
    vi.mocked(fs.unlink).mockClear();
    delete process.env.MEDIA_BASE_URL;
  });

  it("unlinks local upload files", async () => {
    await deleteMediaUrl("/uploads/audio/track.mp3");
    expect(fs.unlink).toHaveBeenCalledOnce();
  });

  it("skips external URLs", async () => {
    await deleteMediaUrl("https://other-cdn.example.com/audio/track.mp3");
    expect(fs.unlink).not.toHaveBeenCalled();
  });
});
