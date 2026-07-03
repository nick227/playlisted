import { trafficHeaders } from "@/lib/trafficIdentity";
import type { TranscriptEntity } from "@/types/transcript";

export type SubtitleStatus = "MISSING" | "DISABLED" | "QUEUED" | "PROCESSING" | "READY" | "FAILED";

export type SubtitleSegment = {
  start: number;
  end: number;
  text: string;
};

export type RecordingSubtitlesResponse = {
  status: SubtitleStatus;
  language?: string | null;
  segments?: SubtitleSegment[];
  vttText?: string;
  errorMessage?: string;
  subtitlePosition?: string;
  subtitleStyleId?: string;
};

export const RECORDING_SUBTITLES_DISABLED_EVENT = "playlisted:recording-subtitles-disabled-changed";
export const RECORDING_SUBTITLE_STYLE_CHANGED_EVENT = "playlisted:recording-subtitle-style-changed";

export type RecordingSubtitlesDisabledEventDetail = {
  recordingId: string;
  subtitlesDisabled: boolean;
};

export type RecordingSubtitleStyleChangedEventDetail = {
  recordingId: string;
  subtitlePosition: string;
  subtitleStyleId: string;
};

export async function fetchRecordingSubtitles(recordingId: string, accessToken?: string | null) {
  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  const response = await fetch(`${base}/api/v1/recordings/${encodeURIComponent(recordingId)}/subtitles`, {
    headers: {
      ...trafficHeaders(),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error("Subtitles unavailable");
  }

  return response.json() as Promise<RecordingSubtitlesResponse>;
}

function safeFilename(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "transcript";
}

export async function downloadRecordingTranscript(params: {
  recordingId: string;
  title: string;
  accessToken?: string | null;
}) {
  const subtitles = await fetchRecordingSubtitles(params.recordingId, params.accessToken);
  if (subtitles.status !== "READY" || !subtitles.vttText) {
    throw new Error("Transcript unavailable");
  }

  const blob = new Blob([subtitles.vttText], { type: "text/vtt;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFilename(params.title)}.vtt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function fetchTranscripts(recordingId: string, accessToken?: string | null): Promise<TranscriptEntity[]> {
  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  const response = await fetch(`${base}/api/v1/recordings/${encodeURIComponent(recordingId)}/transcripts`, {
    headers: {
      ...trafficHeaders(),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
  if (!response.ok) throw new Error("Failed to fetch transcripts");
  return response.json() as Promise<TranscriptEntity[]>;
}

export async function updateTranscript(
  recordingId: string,
  transcriptId: string,
  updates: Partial<TranscriptEntity>,
  accessToken: string
): Promise<TranscriptEntity> {
  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  const response = await fetch(`${base}/api/v1/recordings/${encodeURIComponent(recordingId)}/transcripts/${encodeURIComponent(transcriptId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...trafficHeaders(),
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error("Failed to update transcript");
  return response.json();
}

export async function updateRecordingSubtitlesDisabled(
  recordingId: string,
  subtitlesDisabled: boolean,
  accessToken: string
): Promise<{ subtitlesDisabled: boolean }> {
  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  const response = await fetch(`${base}/api/v1/recordings/${encodeURIComponent(recordingId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...trafficHeaders(),
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ subtitlesDisabled }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.message || "Failed to update subtitle settings");
  }
  const updated = await response.json();
  window.dispatchEvent(
    new CustomEvent<RecordingSubtitlesDisabledEventDetail>(RECORDING_SUBTITLES_DISABLED_EVENT, {
      detail: { recordingId, subtitlesDisabled },
    }),
  );
  return updated;
}

export async function updateRecordingSubtitleStyle(
  recordingId: string,
  style: { subtitlePosition: string; subtitleStyleId: string },
  accessToken: string,
): Promise<{ subtitlePosition: string; subtitleStyleId: string }> {
  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  const response = await fetch(`${base}/api/v1/recordings/${encodeURIComponent(recordingId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...trafficHeaders(),
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(style),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.message || "Failed to update subtitle style");
  }
  const updated = await response.json();
  const detail = {
    recordingId,
    subtitlePosition: updated.subtitlePosition,
    subtitleStyleId: updated.subtitleStyleId,
  };
  window.dispatchEvent(
    new CustomEvent<RecordingSubtitleStyleChangedEventDetail>(RECORDING_SUBTITLE_STYLE_CHANGED_EVENT, {
      detail,
    }),
  );
  return detail;
}

export async function createManualTranscript(
  recordingId: string,
  srtText: string,
  accessToken: string
): Promise<TranscriptEntity> {
  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  const response = await fetch(`${base}/api/v1/recordings/${encodeURIComponent(recordingId)}/transcripts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...trafficHeaders(),
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ srtText }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.message || "Failed to create transcript");
  }
  return response.json();
}

export async function uploadTranscript(
  recordingId: string,
  file: File,
  accessToken: string
): Promise<TranscriptEntity> {
  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await fetch(`${base}/api/v1/recordings/${encodeURIComponent(recordingId)}/transcripts/upload`, {
    method: "POST",
    headers: {
      ...trafficHeaders(),
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });
  if (!response.ok) throw new Error("Failed to upload transcript");
  return response.json();
}

export async function generateTranscript(
  recordingId: string,
  provider: "modal" | "whisper",
  accessToken: string
): Promise<TranscriptEntity> {
  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  const response = await fetch(`${base}/api/v1/recordings/${encodeURIComponent(recordingId)}/transcripts/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...trafficHeaders(),
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ provider }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.message || "Failed to generate transcript");
  }
  return response.json();
}
