import fs from "node:fs/promises";
import path from "node:path";

import { storageKeyFromUploadUrl } from "../storage/deleteStoredUpload.js";
import { headObjectFromR2, isR2StorageEnabled } from "../storage/r2Storage.js";

const IMAGE_MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const VIDEO_MIME_BY_EXT: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

function mimeTypeForStorageKey(storageKey: string, kind: "image" | "video"): string {
  const ext = path.extname(storageKey).toLowerCase();
  const map = kind === "video" ? VIDEO_MIME_BY_EXT : IMAGE_MIME_BY_EXT;
  return map[ext] ?? (kind === "video" ? "video/mp4" : "image/jpeg");
}

async function readLocalUploadMetadata(storageKey: string, kind: "image" | "video") {
  const uploadsDir = path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? "uploads");
  const filePath = path.join(uploadsDir, storageKey);
  const stat = await fs.stat(filePath);
  return {
    sizeBytes: stat.size,
    mimeType: mimeTypeForStorageKey(storageKey, kind),
  };
}

async function readR2UploadMetadata(storageKey: string, kind: "image" | "video") {
  const response = await headObjectFromR2(storageKey);
  return {
    sizeBytes: response.ContentLength ?? 0,
    mimeType: response.ContentType ?? mimeTypeForStorageKey(storageKey, kind),
  };
}

export async function readStoredUploadMetadata(url: string, kind: "image" | "video") {
  const storageKey = storageKeyFromUploadUrl(url);
  if (!storageKey) {
    throw new Error("upload_url_invalid");
  }

  if (isR2StorageEnabled()) {
    return readR2UploadMetadata(storageKey, kind);
  }

  return readLocalUploadMetadata(storageKey, kind);
}
