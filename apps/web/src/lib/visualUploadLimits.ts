/** Client-side caps — must stay aligned with backend uploadPolicy. */
export const VISUAL_UPLOAD_MAX_BYTES = {
  video: 25 * 1024 * 1024,
  image: 5 * 1024 * 1024,
  /** Future Lottie JSON — vector animations, small payload, parsed client-side. */
  lottie: 2 * 1024 * 1024,
} as const;

export function visualUploadKindForFile(file: File): "video" | "image" | null {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  return null;
}

export function validateVisualUploadFile(file: File): string | null {
  const kind = visualUploadKindForFile(file);
  if (!kind) return "Only video and image files are supported.";
  const maxBytes = VISUAL_UPLOAD_MAX_BYTES[kind];
  if (file.size > maxBytes) {
    const maxMb = maxBytes / (1024 * 1024);
    return `${kind === "video" ? "Video" : "Image"} must be ${maxMb} MB or smaller.`;
  }
  return null;
}
