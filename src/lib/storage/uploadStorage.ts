import fs from "node:fs/promises";

import { isR2StorageEnabled, uploadFileToR2 } from "./r2Storage.js";
import { storedUploadUrl } from "../uploadMulter.js";

export async function persistUploadedFile(input: {
  subdir: "audio" | "images";
  filename: string;
  filePath: string;
  mimeType: string;
  removeLocalAfterRemote?: boolean;
}) {
  if (!isR2StorageEnabled()) {
    return {
      url: storedUploadUrl(input.subdir, input.filename),
      storageKey: `${input.subdir}/${input.filename}`,
      provider: "local" as const,
    };
  }

  const storageKey = `${input.subdir}/${input.filename}`;
  const uploaded = await uploadFileToR2({
    key: storageKey,
    filePath: input.filePath,
    contentType: input.mimeType,
  });

  if (input.removeLocalAfterRemote !== false) {
    await fs.unlink(input.filePath).catch(() => undefined);
  }

  return {
    url: uploaded.url,
    storageKey: uploaded.key,
    provider: "r2" as const,
  };
}
