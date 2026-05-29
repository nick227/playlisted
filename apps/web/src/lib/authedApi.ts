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

type UploadAudioResult = {
  url: string;
  mimeType: string;
  bytes: number;
  title: string;
};

export async function uploadAudioFile(
  file: File,
  accessToken: string,
  options?: { onProgress?: (progress01: number) => void },
) {
  const form = new FormData();
  form.append("file", file);

  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  const url = `${base}/api/v1/uploads/audio`;

  const result = await new Promise<UploadAudioResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);

    xhr.upload.onprogress = (event) => {
      if (!options?.onProgress) return;
      if (!event.lengthComputable) return;
      const progress01 = event.total > 0 ? event.loaded / event.total : 0;
      options.onProgress(Math.max(0, Math.min(1, progress01)));
    };

    xhr.onerror = () => reject(new Error("Upload failed."));
    xhr.onabort = () => reject(new Error("Upload aborted."));

    xhr.onload = () => {
      const ok = xhr.status >= 200 && xhr.status < 300;
      const raw = xhr.responseText;
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;

      if (!ok) {
        if (typeof parsed === "object" && parsed && "message" in parsed) {
          reject(new Error(String((parsed as { message: string }).message)));
          return;
        }
        reject(new Error("Upload failed."));
        return;
      }

      resolve(parsed as UploadAudioResult);
    };

    xhr.send(form);
  });

  options?.onProgress?.(1);
  return result;
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
  files: { url: string; mimeType: string; bytes: number; title: string; durationSeconds?: number | null }[],
  playlistId: string,
  accessToken: string,
) {
  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  const response = await fetch(`${base}/api/v1/uploads/audio/bulk-register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ playlistId, files }),
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
    playlistId: string;
  }>;
}
