import fs from "node:fs/promises";
import path from "node:path";

import { deleteObjectFromR2, isR2StorageEnabled } from "./r2Storage.js";

const uploadsDir = path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? "uploads");

export async function deleteStoredUpload(storageKey: string | null | undefined) {
  if (!storageKey) return;

  if (isR2StorageEnabled()) {
    await deleteObjectFromR2(storageKey);
    return;
  }

  const localPath = path.join(uploadsDir, storageKey);
  await fs.unlink(localPath).catch(() => undefined);
}
