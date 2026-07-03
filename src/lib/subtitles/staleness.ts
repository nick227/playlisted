import { prisma } from "../prisma.js";

/**
 * Subtitle generation is one-shot and fail-fast: a row that sits QUEUED this
 * long was never picked up (no worker running), and a row PROCESSING this
 * long means the worker died mid-job. Either way it will never complete —
 * fail it so clients stop waiting; creators can add subtitles manually or
 * regenerate at any time.
 */
export const SUBTITLES_QUEUED_STALE_MS =
  Number(process.env.SUBTITLES_QUEUED_STALE_MINUTES ?? 15) * 60_000;
export const SUBTITLES_PROCESSING_STALE_MS =
  Number(process.env.SUBTITLES_PROCESSING_STALE_MINUTES ?? 30) * 60_000;

type PendingSubtitleStatus = "QUEUED" | "PROCESSING";

export type SubtitleStalenessInput = {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export function subtitleStaleReason(subtitle: SubtitleStalenessInput): string | null {
  if (
    subtitle.status === "QUEUED" &&
    Date.now() - subtitle.createdAt.getTime() > SUBTITLES_QUEUED_STALE_MS
  ) {
    return "Subtitle generation was never started. Add subtitles manually or regenerate.";
  }
  if (
    subtitle.status === "PROCESSING" &&
    Date.now() - subtitle.updatedAt.getTime() > SUBTITLES_PROCESSING_STALE_MS
  ) {
    return "Subtitle generation did not finish. Add subtitles manually or regenerate.";
  }
  return null;
}

/**
 * Lazily fail a stale pending row at read time. The status guard makes this
 * race-safe: a worker that just claimed the row wins and the read keeps the
 * pending status. Returns the failure reason when the row was failed.
 */
export async function failSubtitleIfStale(
  subtitle: SubtitleStalenessInput,
): Promise<string | null> {
  const reason = subtitleStaleReason(subtitle);
  if (!reason || !subtitle.id) return null;

  const result = await prisma.recordingSubtitle.updateMany({
    where: { id: subtitle.id, status: subtitle.status as PendingSubtitleStatus },
    data: { status: "FAILED", errorMessage: reason },
  });
  return result.count === 1 ? reason : null;
}
