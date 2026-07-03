import { visualUploadKindForFile } from "@/lib/visualUploadLimits";
import type { VisualMediaAssetRecord } from "@/lib/visualMediaApi";
import type { VisualUploadProgress } from "@/lib/visualUploadProgress";

type VisualUploadMetadata = {
  durationMs?: number;
  width?: number;
  height?: number;
};

export type VisualUploadOptions = {
  kind?: "video" | "image";
  onProgress?: (progress: VisualUploadProgress) => void;
};

const VISUAL_UPLOAD_TIMEOUT_MS = 30 * 60 * 1000;
const METADATA_PREPARE_BUDGET_MS = 750;

function apiBase() {
  return import.meta.env.VITE_API_BASE_URL ?? "";
}

function appendOptionalNumber(form: FormData, key: keyof VisualUploadMetadata, value: number | undefined) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    form.append(key, String(Math.round(value)));
  }
}

function readImageUploadMetadata(file: File): Promise<VisualUploadMetadata> {
  if (typeof window === "undefined" || typeof Image === "undefined" || !URL.createObjectURL) {
    return Promise.reject(new Error("image_metadata_unavailable"));
  }

  const url = URL.createObjectURL(file);
  return new Promise<VisualUploadMetadata>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image_metadata_failed"));
    };
    image.src = url;
  });
}

function readVideoUploadMetadata(file: File): Promise<VisualUploadMetadata> {
  if (typeof window === "undefined" || typeof document === "undefined" || !URL.createObjectURL) {
    return Promise.reject(new Error("video_metadata_unavailable"));
  }

  const url = URL.createObjectURL(file);
  return new Promise<VisualUploadMetadata>((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        durationMs: Number.isFinite(video.duration) && video.duration > 0
          ? video.duration * 1000
          : undefined,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("video_metadata_failed"));
    };
    video.src = url;
    video.load();
  });
}

async function readVisualUploadMetadata(file: File, kind: "video" | "image"): Promise<VisualUploadMetadata | null> {
  const reader = kind === "video" ? readVideoUploadMetadata(file) : readImageUploadMetadata(file);
  return Promise.race([
    reader.catch(() => null),
    new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), METADATA_PREPARE_BUDGET_MS);
    }),
  ]);
}

function xhrErrorMessage(xhr: XMLHttpRequest): string {
  if (xhr.status === 0) {
    return "Upload could not reach the server. Check your connection and try a smaller file.";
  }
  if (xhr.status === 413) {
    return "File exceeds the server upload limit.";
  }
  if (xhr.status === 415) {
    return "Unsupported file type for visual upload.";
  }
  if (xhr.status === 429) {
    return "Too many uploads. Wait a moment and try again.";
  }
  try {
    const payload = JSON.parse(xhr.responseText) as { message?: string };
    if (payload?.message) return payload.message;
  } catch {
    // ignore parse errors
  }
  return `Upload failed (${xhr.status}).`;
}

function postVisualUploadForm(
  url: string,
  form: FormData,
  accessToken: string,
  fileName: string,
  onProgress?: (progress: VisualUploadProgress) => void,
): Promise<VisualMediaAssetRecord> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.withCredentials = true;
    xhr.timeout = VISUAL_UPLOAD_TIMEOUT_MS;

    xhr.upload.onprogress = (event) => {
      if (!onProgress) return;
      if (event.lengthComputable && event.total > 0) {
        const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
        onProgress({ phase: "uploading", fileName, percent });
        return;
      }
      onProgress({ phase: "uploading", fileName, percent: null });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.({ phase: "processing", fileName, percent: 100 });
        try {
          resolve(JSON.parse(xhr.responseText) as VisualMediaAssetRecord);
          return;
        } catch {
          reject(new Error("Server returned an invalid upload response."));
          return;
        }
      }
      reject(new Error(xhrErrorMessage(xhr)));
    };

    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.ontimeout = () => reject(new Error("Upload timed out. Try a smaller file or a faster connection."));

    onProgress?.({ phase: "uploading", fileName, percent: 0 });
    xhr.send(form);
  });
}

function resolveUploadKind(file: File, explicitKind?: "video" | "image"): "video" | "image" {
  const kind = explicitKind ?? visualUploadKindForFile(file);
  if (!kind) {
    throw new Error("Only video and image files are supported.");
  }
  return kind;
}

export async function uploadVisualMediaFile(
  file: File,
  accessToken: string,
  options: VisualUploadOptions = {},
) {
  const kind = resolveUploadKind(file, options.kind);
  const onProgress = options.onProgress;

  onProgress?.({ phase: "preparing", fileName: file.name, percent: null });

  const form = new FormData();
  form.append("file", file);

  const metadata = await readVisualUploadMetadata(file, kind);
  if (metadata) {
    appendOptionalNumber(form, "durationMs", metadata.durationMs);
    appendOptionalNumber(form, "width", metadata.width);
    appendOptionalNumber(form, "height", metadata.height);
  }

  return postVisualUploadForm(
    `${apiBase()}/api/v1/visual-media/upload?kind=${kind}`,
    form,
    accessToken,
    file.name,
    onProgress,
  );
}
