export type UploadMediaKind = "audio" | "image" | "video";

/** Generous audio cap; visual caps tuned for studio uploads. */
export const UPLOAD_MAX_BYTES: Record<UploadMediaKind, number> = {
  audio: 100 * 1024 * 1024,
  image: 15 * 1024 * 1024,
  video: 250 * 1024 * 1024,
};

/** Planned cap for Lottie JSON attachments (not wired to upload yet). */
export const LOTTIE_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;

export const BULK_REGISTER_MAX_FILES = 50;

export const UPLOAD_ALLOWED: Record<UploadMediaKind, { mimes: Set<string>; exts: Set<string> }> = {
  audio: {
    mimes: new Set([
      "audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/x-wav",
      "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/flac", "audio/x-flac",
      "audio/ogg", "audio/vorbis", "audio/aac", "audio/webm",
    ]),
    exts: new Set([".mp3", ".wav", ".m4a", ".flac", ".ogg", ".aac", ".webm"]),
  },
  image: {
    mimes: new Set(["image/jpeg", "image/png", "image/webp"]),
    exts: new Set([".jpg", ".jpeg", ".png", ".webp"]),
  },
  video: {
    mimes: new Set(["video/mp4", "video/webm", "video/quicktime"]),
    exts: new Set([".mp4", ".webm", ".mov"]),
  },
};

export function isUploadMediaAllowed(kind: UploadMediaKind, mimeType: string, ext: string): boolean {
  const list = UPLOAD_ALLOWED[kind];
  return list.mimes.has(mimeType.toLowerCase()) && list.exts.has(ext.toLowerCase());
}

export function uploadMaxMegabytes(kind: UploadMediaKind): number {
  return UPLOAD_MAX_BYTES[kind] / (1024 * 1024);
}

export function fileTooLargeMessage(kind: UploadMediaKind): string {
  return `File exceeds the ${uploadMaxMegabytes(kind)} MB limit.`;
}

export function unsupportedMediaMessage(kind: UploadMediaKind): string {
  return `Unsupported file type. Allowed extensions: ${[...UPLOAD_ALLOWED[kind].exts].join(", ")}.`;
}
