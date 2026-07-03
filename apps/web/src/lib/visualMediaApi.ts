import type { SongVisualPolicy, VisualMediaBeatFx } from "@/theatre/media/types";

import { visualUploadKindForFile } from "@/lib/visualUploadLimits";

export type VisualMediaAssetRecord = {
  id: string;
  ownerId: string;
  mediaType: "image" | "video";
  url: string;
  thumbnailUrl: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  createdAt: string;
};

export type SongVisualAttachmentRecord = {
  id: string;
  songId: string;
  recordingId: string;
  mediaAssetId: string;
  policy: SongVisualPolicy;
  weight: number;
  order: number;
  label: string | null;
  enabled: boolean;
  playback: Record<string, unknown> | null;
  rotation: Record<string, unknown> | null;
  beatFx: VisualMediaBeatFx | null;
  tags: string[] | null;
  mediaAsset: VisualMediaAssetRecord;
  createdAt: string;
  updatedAt: string;
};

export type SongVisualMediaRecord = {
  songId: string;
  recordingId: string;
  policy: SongVisualPolicy;
  attachments: SongVisualAttachmentRecord[];
};

type VisualUploadMetadata = {
  durationMs?: number;
  width?: number;
  height?: number;
};

export type VisualUploadPhase = "preparing" | "uploading" | "processing";

export type VisualUploadProgress = {
  phase: VisualUploadPhase;
  fileName: string;
  /** 0–100 when known; null for indeterminate (e.g. metadata read). */
  percent: number | null;
};

const VISUAL_UPLOAD_TIMEOUT_MS = 30 * 60 * 1000;
const METADATA_PREPARE_BUDGET_MS = 750;

function apiBase() {
  return import.meta.env.VITE_API_BASE_URL ?? "";
}

function authHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(payload?.message ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function appendOptionalNumber(form: FormData, key: keyof VisualUploadMetadata, value: number | undefined) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    form.append(key, String(Math.round(value)));
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => resolve(null), timeoutMs);
    promise
      .then((value) => resolve(value))
      .catch(() => resolve(null))
      .finally(() => window.clearTimeout(timeoutId));
  });
}

async function readImageUploadMetadata(file: File): Promise<VisualUploadMetadata | null> {
  if (typeof window === "undefined" || typeof Image === "undefined" || !URL.createObjectURL) return null;

  const url = URL.createObjectURL(file);
  try {
    return await withTimeout(new Promise<VisualUploadMetadata>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      };
      image.onerror = () => reject(new Error("image_metadata_failed"));
      image.src = url;
    }), 3000);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function readVideoUploadMetadata(file: File): Promise<VisualUploadMetadata | null> {
  if (typeof window === "undefined" || typeof document === "undefined" || !URL.createObjectURL) return null;

  const url = URL.createObjectURL(file);
  try {
    return await withTimeout(new Promise<VisualUploadMetadata>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.onloadedmetadata = () => {
        resolve({
          durationMs: Number.isFinite(video.duration) && video.duration > 0
            ? video.duration * 1000
            : undefined,
          width: video.videoWidth,
          height: video.videoHeight,
        });
      };
      video.onerror = () => reject(new Error("video_metadata_failed"));
      video.src = url;
      video.load();
    }), 5000);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function readVisualUploadMetadata(file: File, kind: "video" | "image"): Promise<VisualUploadMetadata | null> {
  return Promise.race([
    kind === "video" ? readVideoUploadMetadata(file) : readImageUploadMetadata(file),
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
  onProgress?: (progress: VisualUploadProgress) => void,
  fileName = "file",
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

    xhr.onerror = () => {
      reject(new Error("Network error during upload."));
    };

    xhr.ontimeout = () => {
      reject(new Error("Upload timed out. Try a smaller file or a faster connection."));
    };

    onProgress?.({ phase: "uploading", fileName, percent: 0 });
    xhr.send(form);
  });
}

export async function importVisualMediaVideoFromUrl(
  url: string,
  originalName: string,
  accessToken: string,
  existingAssets: VisualMediaAssetRecord[],
) {
  const resolved = new URL(url, window.location.origin).href;
  const existing = existingAssets.find(
    (asset) =>
      asset.mediaType === "video" &&
      new URL(asset.url, window.location.origin).href === resolved,
  );
  if (existing) return existing;

  const response = await fetch(resolved, { credentials: "include" });
  if (!response.ok) {
    throw new Error("Could not import video.");
  }

  const blob = await response.blob();
  const extension = blob.type.includes("webm") ? "webm" : "mp4";
  const file = new File([blob], `${originalName}.${extension}`, {
    type: blob.type || "video/mp4",
  });
  return uploadVisualMediaFile(file, accessToken, "video");
}

const THEATRE_PLACEHOLDER_NAME = "theatre-fx-placeholder.png";

export async function ensureTheatrePlaceholderAsset(
  accessToken: string,
  existingAssets: VisualMediaAssetRecord[],
) {
  const existing = existingAssets.find((asset) => asset.originalName === THEATRE_PLACEHOLDER_NAME);
  if (existing) return existing;

  const bytes = Uint8Array.from(
    atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="),
    (char) => char.charCodeAt(0),
  );
  const file = new File([bytes], THEATRE_PLACEHOLDER_NAME, { type: "image/png" });
  return uploadVisualMediaFile(file, accessToken, "image");
}

export async function importVisualMediaImageFromUrl(
  url: string,
  originalName: string,
  accessToken: string,
  existingAssets: VisualMediaAssetRecord[],
) {
  const resolved = new URL(url, window.location.origin).href;
  const existing = existingAssets.find(
    (asset) =>
      asset.mediaType === "image" &&
      new URL(asset.url, window.location.origin).href === resolved,
  );
  if (existing) return existing;

  const response = await fetch(resolved, { credentials: "include" });
  if (!response.ok) {
    throw new Error("Could not import image.");
  }

  const blob = await response.blob();
  const extension = blob.type.includes("png") ? "png" : "jpg";
  const file = new File([blob], `${originalName}.${extension}`, {
    type: blob.type || "image/jpeg",
  });
  return uploadVisualMediaFile(file, accessToken, "image");
}

export async function listVisualMediaAssets(accessToken: string) {
  const response = await fetch(`${apiBase()}/api/v1/visual-media`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  const payload = await parseJson<{ items: VisualMediaAssetRecord[] }>(response);
  return payload.items;
}

export async function uploadVisualMediaFile(
  file: File,
  accessToken: string,
  kind: "video" | "image" = visualUploadKindForFile(file) ?? (file.type.startsWith("video/") ? "video" : "image"),
  onProgress?: (progress: VisualUploadProgress) => void,
) {
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
    onProgress,
    file.name,
  );
}

export async function fetchSongVisualAttachments(recordingId: string, accessToken?: string | null) {
  const headers = accessToken ? authHeaders(accessToken) : undefined;
  const response = await fetch(`${apiBase()}/api/v1/songs/${encodeURIComponent(recordingId)}/visual-media`, {
    headers,
    credentials: "include",
  });
  return parseJson<SongVisualMediaRecord>(response);
}

export async function attachSongVisualMedia(
  recordingId: string,
  accessToken: string,
  body: {
    mediaAssetId: string;
    policy?: SongVisualPolicy;
    weight?: number;
    order?: number;
    label?: string;
    beatFx?: VisualMediaBeatFx;
    playback?: Record<string, unknown>;
    tags?: string[] | null;
  },
) {
  const response = await fetch(`${apiBase()}/api/v1/songs/${encodeURIComponent(recordingId)}/visual-media`, {
    method: "POST",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    credentials: "include",
  });
  return parseJson<SongVisualAttachmentRecord>(response);
}

export async function updateSongVisualAttachment(
  recordingId: string,
  attachmentId: string,
  accessToken: string,
  body: Partial<{
    policy: SongVisualPolicy;
    weight: number;
    order: number;
    enabled: boolean;
    beatFx: VisualMediaBeatFx | null;
    playback: Record<string, unknown> | null;
    tags: string[] | null;
  }>,
) {
  const response = await fetch(
    `${apiBase()}/api/v1/songs/${encodeURIComponent(recordingId)}/visual-media/${encodeURIComponent(attachmentId)}`,
    {
      method: "PATCH",
      headers: {
        ...authHeaders(accessToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      credentials: "include",
    },
  );
  return parseJson<SongVisualAttachmentRecord>(response);
}

export async function detachSongVisualMedia(
  recordingId: string,
  attachmentId: string,
  accessToken: string,
) {
  const response = await fetch(
    `${apiBase()}/api/v1/songs/${encodeURIComponent(recordingId)}/visual-media/${encodeURIComponent(attachmentId)}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken),
      credentials: "include",
    },
  );
  if (!response.ok && response.status !== 204) {
    await parseJson(response);
  }
}

export async function deleteVisualMediaAsset(assetId: string, accessToken: string) {
  const response = await fetch(`${apiBase()}/api/v1/visual-media/${encodeURIComponent(assetId)}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!response.ok && response.status !== 204) {
    await parseJson(response);
  }
}
