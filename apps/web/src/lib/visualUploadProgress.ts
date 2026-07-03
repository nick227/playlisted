export type VisualUploadPhase = "preparing" | "uploading" | "processing";

export type VisualUploadProgress = {
  phase: VisualUploadPhase;
  fileName: string;
  /** 0–100 when known; null for indeterminate phases. */
  percent: number | null;
};

export type PendingVisualUpload = {
  id: string;
  fileName: string;
  mediaType: "image" | "video";
  sizeBytes: number;
  previewUrl: string;
};

type ProgressLabelStyle = "button" | "overlay";

export function formatVisualUploadProgressLabel(
  progress: VisualUploadProgress | null,
  style: ProgressLabelStyle,
): string {
  if (!progress) return style === "button" ? "Uploading…" : "Uploading…";

  if (progress.phase === "preparing") {
    return style === "button" ? "Preparing…" : "Preparing upload…";
  }
  if (progress.phase === "processing") {
    return style === "button" ? "Finishing…" : "Saving on server…";
  }
  if (progress.percent != null) {
    return `Uploading ${progress.percent}%`;
  }
  return "Uploading…";
}
