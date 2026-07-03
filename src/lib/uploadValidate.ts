import fs from "node:fs/promises";
import path from "node:path";

import type { Response } from "express";

import {
  isUploadMediaAllowed,
  UPLOAD_ALLOWED,
  unsupportedMediaMessage,
  type UploadMediaKind,
} from "./uploadPolicy.js";

/**
 * Browsers send `application/octet-stream` (or nothing) for files whose type
 * the OS doesn't register — common for .mov/.mp4 on some platforms. Fall back
 * to the extension allowlist in that case instead of rejecting after the
 * client has already transferred the whole file.
 */
const GENERIC_MIME_TYPES = new Set(["", "application/octet-stream"]);

const EXTENSION_MIME_TYPES: Record<UploadMediaKind, Record<string, string>> = {
  audio: {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".flac": "audio/flac",
    ".ogg": "audio/ogg",
    ".aac": "audio/aac",
    ".webm": "audio/webm",
  },
  image: {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  },
  video: {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
  },
};

function isGenericMimeType(mimeType: string | undefined): boolean {
  return GENERIC_MIME_TYPES.has((mimeType ?? "").toLowerCase());
}

function isUploadAllowed(
  kind: UploadMediaKind,
  file: Express.Multer.File,
  allowExtensionFallback: boolean,
): boolean {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowExtensionFallback && isGenericMimeType(file.mimetype)) {
    return UPLOAD_ALLOWED[kind].exts.has(ext);
  }
  return isUploadMediaAllowed(kind, file.mimetype, ext);
}

/**
 * Content type to persist (R2 object metadata + DB). Replaces a generic
 * browser MIME with the canonical type for the file's extension so stored
 * videos stream with a real `video/*` content type.
 */
export function resolveUploadMimeType(kind: UploadMediaKind, file: Express.Multer.File): string {
  if (!isGenericMimeType(file.mimetype)) return file.mimetype;
  const ext = path.extname(file.originalname).toLowerCase();
  return EXTENSION_MIME_TYPES[kind][ext] ?? "application/octet-stream";
}

export async function rejectDisallowedUpload(
  kind: UploadMediaKind,
  file: Express.Multer.File,
  res: Response,
  options?: {
    /**
     * Accept a generic MIME when the extension is allowed. Enable for
     * browser-facing routes; keep programmatic ingest strict so integration
     * bugs surface as 415s.
     */
    allowExtensionFallback?: boolean;
  },
): Promise<boolean> {
  if (isUploadAllowed(kind, file, options?.allowExtensionFallback ?? false)) {
    return false;
  }

  await fs.unlink(file.path).catch(() => undefined);
  res.status(415).json({
    error: "unsupported_media_type",
    message: unsupportedMediaMessage(kind),
  });
  return true;
}
