import {
  UPLOAD_ALLOWED_EXTENSIONS,
  UPLOAD_MAX_BYTES,
  visualUploadKindForExtension,
} from "@playlisted/upload-policy";

/** Client-side caps — sourced from @playlisted/upload-policy. */
export const VISUAL_UPLOAD_MAX_BYTES = {
  video: UPLOAD_MAX_BYTES.video,
  image: UPLOAD_MAX_BYTES.image,
  /** Future Lottie JSON — vector animations, small payload, parsed client-side. */
  lottie: 2 * 1024 * 1024,
} as const;

function extensionForFile(file: File) {
  const match = /\.[^.]+$/.exec(file.name.toLowerCase());
  return match?.[0] ?? "";
}

export function visualUploadKindForFile(file: File): "video" | "image" | null {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  return visualUploadKindForExtension(extensionForFile(file));
}

export function validateVisualUploadFile(file: File): string | null {
  const kind = visualUploadKindForFile(file);
  if (!kind) {
    const allowed = [...UPLOAD_ALLOWED_EXTENSIONS.image, ...UPLOAD_ALLOWED_EXTENSIONS.video].join(", ");
    return `Only video and image files are supported (${allowed}).`;
  }
  const maxBytes = VISUAL_UPLOAD_MAX_BYTES[kind];
  if (file.size > maxBytes) {
    const maxMb = maxBytes / (1024 * 1024);
    return `${kind === "video" ? "Video" : "Image"} must be ${maxMb} MB or smaller.`;
  }
  return null;
}
