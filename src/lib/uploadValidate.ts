import fs from "node:fs/promises";
import path from "node:path";

import type { Response } from "express";

import {
  isUploadMediaAllowed,
  unsupportedMediaMessage,
  type UploadMediaKind,
} from "./uploadPolicy.js";

export async function rejectDisallowedUpload(
  kind: UploadMediaKind,
  file: Express.Multer.File,
  res: Response,
): Promise<boolean> {
  const ext = path.extname(file.originalname).toLowerCase();
  if (isUploadMediaAllowed(kind, file.mimetype, ext)) {
    return false;
  }

  await fs.unlink(file.path).catch(() => undefined);
  res.status(415).json({
    error: "unsupported_media_type",
    message: unsupportedMediaMessage(kind),
  });
  return true;
}
