import { describe, expect, it } from "vitest";

import { normalizeVisualMediaUrl, visualMediaUploadPathKey } from "./visualMediaUrl";

describe("visualMediaUrl", () => {
  it("normalizes absolute and relative upload URLs to the same pathname", () => {
    expect(normalizeVisualMediaUrl("/uploads/images/art.jpg")).toBe("/uploads/images/art.jpg");
    expect(normalizeVisualMediaUrl("https://playlisted.test/uploads/images/art.jpg")).toBe(
      "/uploads/images/art.jpg",
    );
  });

  it("extracts upload path keys for dedupe", () => {
    expect(visualMediaUploadPathKey("/uploads/images/art.jpg")).toBe("images/art.jpg");
    expect(visualMediaUploadPathKey("https://cdn.test/uploads/videos/clip.mp4")).toBe("videos/clip.mp4");
    expect(visualMediaUploadPathKey("https://example.com/external.jpg")).toBeNull();
  });
});
