import type { SongVisualAttachmentRecord } from "@/lib/visualMediaApi";
import type { VisualMediaPlayback } from "@/theatre/media/types";

import type { TimelineClip } from "./types";

const IMAGE_NATURAL_SEC = 8;
const VIDEO_FALLBACK_NATURAL_SEC = 30;
const MIN_CLIP_SEC = 0.5;

export function readClipPlayback(attachment: SongVisualAttachmentRecord): VisualMediaPlayback & {
  timelineDurationSec?: number;
} {
  const playback = attachment.playback;
  if (!playback || typeof playback !== "object") return { loop: attachment.mediaAsset.mediaType === "video" };
  return playback as VisualMediaPlayback & { timelineDurationSec?: number };
}

export function getNaturalDurationSec(attachment: SongVisualAttachmentRecord): number {
  const { mediaAsset } = attachment;
  if (mediaAsset.durationMs && mediaAsset.durationMs > 0) {
    return mediaAsset.durationMs / 1000;
  }
  return mediaAsset.mediaType === "video" ? VIDEO_FALLBACK_NATURAL_SEC : IMAGE_NATURAL_SEC;
}

export function getClipLoop(attachment: SongVisualAttachmentRecord): boolean {
  const playback = readClipPlayback(attachment);
  return playback.loop ?? attachment.mediaAsset.mediaType === "video";
}

export function maxClipDurationSec(
  attachment: SongVisualAttachmentRecord,
  startSec: number,
  songDurationSec: number,
  loop: boolean,
): number {
  const remaining = Math.max(0, songDurationSec - startSec);
  if (loop) return remaining;
  return Math.min(getNaturalDurationSec(attachment), remaining);
}

export function defaultClipDurationSec(
  attachment: SongVisualAttachmentRecord,
  startSec: number,
  songDurationSec: number,
): number {
  const loop = getClipLoop(attachment);
  const remaining = Math.max(0, songDurationSec - startSec);
  if (remaining <= 0) return 0;
  const natural = getNaturalDurationSec(attachment);
  if (loop) return remaining;
  return Math.min(natural, remaining);
}

export function layoutTimelineClips(
  attachments: SongVisualAttachmentRecord[],
  songDurationSec: number,
): TimelineClip[] {
  const enabled = attachments
    .filter((attachment) => attachment.enabled)
    .sort((left, right) => left.order - right.order);

  if (enabled.length === 0 || songDurationSec <= 0) return [];

  let cursorSec = 0;
  const clips: TimelineClip[] = [];

  for (const attachment of enabled) {
    if (cursorSec >= songDurationSec - MIN_CLIP_SEC) break;

    const loop = getClipLoop(attachment);
    const naturalDurationSec = getNaturalDurationSec(attachment);
    const playback = readClipPlayback(attachment);
    const storedDuration = playback.timelineDurationSec;
    const maxDuration = maxClipDurationSec(attachment, cursorSec, songDurationSec, loop);
    const fallbackDuration = defaultClipDurationSec(attachment, cursorSec, songDurationSec);
    let durationSec = storedDuration ?? fallbackDuration;
    durationSec = Math.min(Math.max(MIN_CLIP_SEC, durationSec), maxDuration);

    if (durationSec <= 0) break;

    clips.push({
      attachment,
      startSec: cursorSec,
      endSec: cursorSec + durationSec,
      durationSec,
      loop,
      naturalDurationSec,
    });
    cursorSec += durationSec;
  }

  return clips;
}

export function getRemainingTimelineSec(clips: TimelineClip[], songDurationSec: number): number {
  const usedSec = clips.at(-1)?.endSec ?? 0;
  return Math.max(0, songDurationSec - usedSec);
}

export function buildPlaybackPatch(
  attachment: SongVisualAttachmentRecord,
  patch: Partial<VisualMediaPlayback & { timelineDurationSec?: number }>,
) {
  const current = readClipPlayback(attachment);
  return { ...current, ...patch };
}

export function formatMegabytes(sizeBytes: number) {
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
