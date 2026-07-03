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
  signal?: AbortSignal;
};

const VISUAL_UPLOAD_TIMEOUT_MS = 30 * 60 * 1000;
const METADATA_PREPARE_BUDGET_MS = 750;
const POSTER_PREPARE_BUDGET_MS = 2_000;

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

async function captureVideoPoster(file: File): Promise<Blob | null> {
  if (typeof document === "undefined" || !URL.createObjectURL) return null;

  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("poster_load_failed"));
      video.src = url;
    });

    if (video.videoWidth <= 0 || video.videoHeight <= 0) return null;

    const seekTo = Number.isFinite(video.duration) && video.duration > 0
      ? Math.min(0.5, video.duration * 0.05)
      : 0;
    video.currentTime = seekTo;
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error("poster_seek_failed"));
    });

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(video, 0, 0);

    return await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.82);
    });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function readVideoPoster(file: File): Promise<Blob | null> {
  return Promise.race([
    captureVideoPoster(file),
    new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), POSTER_PREPARE_BUDGET_MS);
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
  signal?: AbortSignal,
): Promise<VisualMediaAssetRecord> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Upload cancelled", "AbortError"));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.withCredentials = true;
    xhr.timeout = VISUAL_UPLOAD_TIMEOUT_MS;

    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort);
    };

    const onAbort = () => {
      xhr.abort();
      cleanup();
      reject(new DOMException("Upload cancelled", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort);

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
      cleanup();
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

    xhr.onerror = () => {
      cleanup();
      reject(new Error("Network error during upload."));
    };

    xhr.ontimeout = () => {
      cleanup();
      reject(new Error("Upload timed out. Try a smaller file or a faster connection."));
    };

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

  const [metadata, poster] = await Promise.all([
    readVisualUploadMetadata(file, kind),
    kind === "video" ? readVideoPoster(file) : Promise.resolve(null),
  ]);

  const form = new FormData();
  form.append("file", file);
  if (metadata) {
    appendOptionalNumber(form, "durationMs", metadata.durationMs);
    appendOptionalNumber(form, "width", metadata.width);
    appendOptionalNumber(form, "height", metadata.height);
  }
  if (poster) {
    const posterName = file.name.replace(/\.[^.]+$/, "") || "video";
    form.append("thumbnail", poster, `${posterName}-poster.jpg`);
  }

  return postVisualUploadForm(
    `${apiBase()}/api/v1/visual-media/upload?kind=${kind}`,
    form,
    accessToken,
    file.name,
    onProgress,
    options.signal,
  );
}
