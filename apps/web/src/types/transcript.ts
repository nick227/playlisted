import type { SubtitleStatus } from "@/lib/subtitles";

export type TranscriptSource = "whisper" | "modal" | "upload" | "manual";

export interface TranscriptEntity {
  id: string;
  recordingId: string;
  source: TranscriptSource;
  status: SubtitleStatus;
  vttText?: string;
  srtText?: string;
  isActive: boolean;
  errorMessage?: string;
  generatedAt?: string;
  createdAt: string;
}
