import { uploadVisualMediaFile } from "@/lib/visualMediaUpload";
import type { SongVisualPolicy, VisualMediaBeatFx } from "@/theatre/media/types";

export type { VisualUploadPhase, VisualUploadProgress, PendingVisualUpload } from "@/lib/visualUploadProgress";
export { uploadVisualMediaFile, type VisualUploadOptions } from "@/lib/visualMediaUpload";

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
  return uploadVisualMediaFile(file, accessToken, { kind: "video" });
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
  return uploadVisualMediaFile(file, accessToken, { kind: "image" });
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
  return uploadVisualMediaFile(file, accessToken, { kind: "image" });
}

export async function listVisualMediaAssets(accessToken: string) {
  const response = await fetch(`${apiBase()}/api/v1/visual-media`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  const payload = await parseJson<{ items: VisualMediaAssetRecord[] }>(response);
  return payload.items;
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
