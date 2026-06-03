import { describe, expect, it } from "vitest";

import {
  BULK_REGISTER_MAX_FILES,
  fileTooLargeMessage,
  isUploadMediaAllowed,
  UPLOAD_MAX_BYTES,
} from "../lib/uploadPolicy.js";

describe("uploadPolicy", () => {
  it("allows common audio and image pairs", () => {
    expect(isUploadMediaAllowed("audio", "audio/mpeg", ".mp3")).toBe(true);
    expect(isUploadMediaAllowed("image", "image/jpeg", ".jpg")).toBe(true);
    expect(isUploadMediaAllowed("image", "image/webp", ".webp")).toBe(true);
  });

  it("rejects mismatched mime and extension", () => {
    expect(isUploadMediaAllowed("audio", "image/jpeg", ".mp3")).toBe(false);
    expect(isUploadMediaAllowed("image", "audio/mpeg", ".jpg")).toBe(false);
    expect(isUploadMediaAllowed("audio", "audio/mpeg", ".exe")).toBe(false);
  });

  it("uses a smaller cap for images than audio", () => {
    expect(UPLOAD_MAX_BYTES.image).toBeLessThan(UPLOAD_MAX_BYTES.audio);
  });

  it("formats size error messages per kind", () => {
    expect(fileTooLargeMessage("audio")).toContain("100");
    expect(fileTooLargeMessage("image")).toContain("15");
  });

  it("caps bulk register batches", () => {
    expect(BULK_REGISTER_MAX_FILES).toBeGreaterThan(0);
  });
});
