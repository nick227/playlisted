import type { SubtitleStatus } from "@/lib/subtitles";

export type TranscriptSource = "WHISPER" | "MODAL" | "UPLOAD" | "MANUAL";

export interface TranscriptEntity {
  id: string;
  recordingId: string;
  source: TranscriptSource;
  status: SubtitleStatus;
  language?: string | null;
  vttText?: string | null;
  srtText?: string | null;
  isActive: boolean;
  errorMessage?: string | null;
  generatedAt?: string | null;
  createdAt: string;
}
