import {
  isUploadMediaAllowed as sharedIsUploadMediaAllowed,
  UPLOAD_ALLOWED_EXTENSIONS,
  UPLOAD_ALLOWED_MIMES,
  UPLOAD_MAX_BYTES as SHARED_UPLOAD_MAX_BYTES,
  type UploadMediaKind,
} from "@playlisted/upload-policy";

export type { UploadMediaKind };

export const UPLOAD_MAX_BYTES: Record<UploadMediaKind, number> = { ...SHARED_UPLOAD_MAX_BYTES };

export const LOTTIE_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;

export const BULK_REGISTER_MAX_FILES = 50;

export const UPLOAD_ALLOWED: Record<UploadMediaKind, { mimes: Set<string>; exts: Set<string> }> = {
  audio: {
    mimes: new Set(UPLOAD_ALLOWED_MIMES.audio),
    exts: new Set(UPLOAD_ALLOWED_EXTENSIONS.audio),
  },
  image: {
    mimes: new Set(UPLOAD_ALLOWED_MIMES.image),
    exts: new Set(UPLOAD_ALLOWED_EXTENSIONS.image),
  },
  video: {
    mimes: new Set(UPLOAD_ALLOWED_MIMES.video),
    exts: new Set(UPLOAD_ALLOWED_EXTENSIONS.video),
  },
};

export function isUploadMediaAllowed(kind: UploadMediaKind, mimeType: string, ext: string): boolean {
  return sharedIsUploadMediaAllowed(kind, mimeType, ext);
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
