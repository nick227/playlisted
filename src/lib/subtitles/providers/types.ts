import type { SubtitleSegment } from "../vtt.js";

export type SubtitleProviderName = "local-python" | "modal" | "disabled";

export type SubtitleProviderInput = {
  subtitleId: string;
  recordingId: string;
  audioPath: string;
  durationSeconds: number;
};

export type SubtitleProviderResult = {
  provider: SubtitleProviderName;
  modelName?: string | null;
  language?: string | null;
  segments: SubtitleSegment[];
  providerJobId?: string | null;
  estimatedCostCents?: number | null;
};
