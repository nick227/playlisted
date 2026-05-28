import { createPlaylistedApi } from "@playlisted/client-sdk";

import { api } from "./api";

export function authedApi(accessToken: string | null) {
  if (!accessToken) {
    return api;
  }

  return createPlaylistedApi({
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function uploadAudioFile(file: File, accessToken: string) {
  const form = new FormData();
  form.append("file", file);

  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  const response = await fetch(`${base}/api/v1/uploads/audio`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      typeof body === "object" && body && "message" in body
        ? String((body as { message: string }).message)
        : "Upload failed.",
    );
  }

  return response.json() as Promise<{
    url: string;
    mimeType: string;
    bytes: number;
    title: string;
  }>;
}

export async function uploadImageFile(file: File, accessToken: string) {
  const form = new FormData();
  form.append("file", file);

  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  const response = await fetch(`${base}/api/v1/uploads/images`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      typeof body === "object" && body && "message" in body
        ? String((body as { message: string }).message)
        : "Upload failed.",
    );
  }

  return response.json() as Promise<{ url: string; mimeType: string; bytes: number }>;
}

export async function bulkRegisterUploads(
  files: { url: string; mimeType: string; bytes: number; title: string }[],
  accessToken: string,
) {
  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  const response = await fetch(`${base}/api/v1/uploads/audio/bulk-register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ files }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      typeof body === "object" && body && "message" in body
        ? String((body as { message: string }).message)
        : "Failed to register uploads.",
    );
  }

  return response.json() as Promise<{
    recordings: { id: string; title: string; audioUrl: string }[];
    inboxPlaylistId: string;
  }>;
}
