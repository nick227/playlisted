import { trafficHeaders } from "@/lib/trafficIdentity";

export type SubtitleStatus = "QUEUED" | "PROCESSING" | "READY" | "FAILED";

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
