import type { SongVisualPolicy, VisualMediaBeatFx } from "@/theatre/media/types";

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
  kind: "video" | "image" = file.type.startsWith("video/") ? "video" : "image",
) {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${apiBase()}/api/v1/visual-media/upload?kind=${kind}`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: form,
    credentials: "include",
  });

  return parseJson<VisualMediaAssetRecord>(response);
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
