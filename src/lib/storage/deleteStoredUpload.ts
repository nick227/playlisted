import fs from "node:fs/promises";
import path from "node:path";

import { deleteObjectFromR2, isR2StorageEnabled } from "./r2Storage.js";

const uploadsDir = path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? "uploads");

export function storageKeyFromUploadUrl(url: string): string | null {
  const publicBase = (process.env.R2_PUBLIC_BASE_URL ?? process.env.UPLOADS_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  const mediaBase = (process.env.MEDIA_BASE_URL ?? "/uploads").replace(/\/$/, "");

  if (publicBase && url.startsWith(`${publicBase}/`)) {
    return decodeURIComponent(url.slice(publicBase.length + 1));
  }
  if (url.startsWith(`${mediaBase}/`)) {
    return url.slice(mediaBase.length + 1);
  }
  if (url.startsWith("/uploads/")) {
    return url.slice("/uploads/".length);
  }
  return null;
}

export async function deleteStoredUpload(storageKey: string | null | undefined) {
  if (!storageKey) return;

  if (isR2StorageEnabled()) {
    await deleteObjectFromR2(storageKey);
    return;
  }

  const localPath = path.join(uploadsDir, storageKey);
  await fs.unlink(localPath).catch(() => undefined);
}
