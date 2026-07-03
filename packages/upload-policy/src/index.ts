export type UploadMediaKind = "audio" | "image" | "video";

export const UPLOAD_MAX_BYTES = {
  audio: 100 * 1024 * 1024,
  image: 15 * 1024 * 1024,
  video: 250 * 1024 * 1024,
} as const satisfies Record<UploadMediaKind, number>;

export const LOTTIE_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;

export const UPLOAD_ALLOWED_MIMES = {
  audio: [
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/x-wav",
    "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/flac", "audio/x-flac",
    "audio/ogg", "audio/vorbis", "audio/aac", "audio/webm",
  ],
  image: ["image/jpeg", "image/png", "image/webp"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
} as const satisfies Record<UploadMediaKind, readonly string[]>;

export const UPLOAD_ALLOWED_EXTENSIONS = {
  audio: [".mp3", ".wav", ".m4a", ".flac", ".ogg", ".aac", ".webm"],
  image: [".jpg", ".jpeg", ".png", ".webp"],
  video: [".mp4", ".webm", ".mov"],
} as const satisfies Record<UploadMediaKind, readonly string[]>;

export type VisualUploadKind = "image" | "video";

export function visualUploadKindForExtension(ext: string): VisualUploadKind | null {
  const normalized = ext.toLowerCase();
  if ((UPLOAD_ALLOWED_EXTENSIONS.video as readonly string[]).includes(normalized)) return "video";
  if ((UPLOAD_ALLOWED_EXTENSIONS.image as readonly string[]).includes(normalized)) return "image";
  return null;
}

export function isUploadMediaAllowed(kind: UploadMediaKind, mimeType: string, ext: string): boolean {
  const mimes = UPLOAD_ALLOWED_MIMES[kind] as readonly string[];
  const exts = UPLOAD_ALLOWED_EXTENSIONS[kind] as readonly string[];
  return mimes.includes(mimeType.toLowerCase()) && exts.includes(ext.toLowerCase());
}

export function uploadMaxMegabytes(kind: UploadMediaKind): number {
  return UPLOAD_MAX_BYTES[kind] / (1024 * 1024);
}
