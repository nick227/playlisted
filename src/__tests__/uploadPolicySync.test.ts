import { describe, expect, it } from "vitest";

import {
  UPLOAD_ALLOWED_EXTENSIONS,
  UPLOAD_MAX_BYTES,
  visualUploadKindForExtension,
} from "@playlisted/upload-policy";

import { UPLOAD_ALLOWED, UPLOAD_MAX_BYTES as SERVER_MAX_BYTES } from "../lib/uploadPolicy.js";

describe("upload policy sync", () => {
  it("keeps server caps aligned with the shared package", () => {
    expect(SERVER_MAX_BYTES).toEqual(UPLOAD_MAX_BYTES);
  });

  it("keeps server extension sets aligned with the shared package", () => {
    for (const kind of ["audio", "image", "video"] as const) {
      expect([...UPLOAD_ALLOWED[kind].exts].sort()).toEqual([...UPLOAD_ALLOWED_EXTENSIONS[kind]].sort());
    }
  });

  it("resolves visual kinds from shared extensions", () => {
    expect(visualUploadKindForExtension(".mp4")).toBe("video");
    expect(visualUploadKindForExtension(".png")).toBe("image");
    expect(visualUploadKindForExtension(".exe")).toBeNull();
  });
});
