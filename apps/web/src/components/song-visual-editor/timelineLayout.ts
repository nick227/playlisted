import type { SongVisualAttachmentRecord } from "@/lib/visualMediaApi";
import type { VisualMediaPlayback } from "@/theatre/media/types";

import type { TimelineClip } from "./types";

const IMAGE_NATURAL_SEC = 8;
const VIDEO_FALLBACK_NATURAL_SEC = 30;
export const MIN_CLIP_SEC = 0.5;
const DRAG_CLICK_THRESHOLD_PX = 4;
const TIME_EPSILON_SEC = 0.01;

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

export function readClipStartOffsetMs(attachment: SongVisualAttachmentRecord): number {
  const playback = readClipPlayback(attachment);
  return Math.max(0, playback.startOffsetMs ?? 0);
}

export function formatMediaOffsetMs(offsetMs: number): string {
  if (offsetMs <= 0) return "0.0s";
  const sec = offsetMs / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${mins}:${rem.toFixed(1).padStart(4, "0")}`;
}

export function remainingMediaSec(attachment: SongVisualAttachmentRecord, startOffsetMs: number): number {
  return Math.max(0, getNaturalDurationSec(attachment) - startOffsetMs / 1000);
}

export function maxClipDurationSec(
  attachment: SongVisualAttachmentRecord,
  startSec: number,
  songDurationSec: number,
  loop: boolean,
  startOffsetMs = 0,
): number {
  const timelineRemaining = Math.max(0, songDurationSec - startSec);
  if (loop) return timelineRemaining;
  return Math.min(remainingMediaSec(attachment, startOffsetMs), timelineRemaining);
}

export function defaultClipDurationSec(
  attachment: SongVisualAttachmentRecord,
  startSec: number,
  songDurationSec: number,
): number {
  const loop = getClipLoop(attachment);
  const maxDuration = maxClipDurationSec(attachment, startSec, songDurationSec, loop, 0);
  if (maxDuration < MIN_CLIP_SEC) return 0;
  if (loop) return maxDuration;
  return Math.min(getNaturalDurationSec(attachment), maxDuration);
}

export function clipDurationAfterLoopChange(
  attachment: SongVisualAttachmentRecord,
  startSec: number,
  songDurationSec: number,
  loop: boolean,
  currentDurationSec?: number,
): number {
  const playback = readClipPlayback(attachment);
  const startOffsetMs = playback.startOffsetMs ?? 0;
  const maxDuration = maxClipDurationSec(attachment, startSec, songDurationSec, loop, startOffsetMs);
  if (maxDuration < MIN_CLIP_SEC) return 0;
  if (loop) return maxDuration;
  if (currentDurationSec == null) {
    return Math.min(remainingMediaSec(attachment, startOffsetMs), maxDuration);
  }
  return Math.min(currentDurationSec, maxDuration);
}

export type ClipBounds = {
  timelineStartSec: number;
  timelineDurationSec: number;
  startOffsetMs: number;
};

function clampDurationSec(
  attachment: SongVisualAttachmentRecord,
  startSec: number,
  durationSec: number,
  songDurationSec: number,
  loop: boolean,
  startOffsetMs: number,
): number {
  const maxDuration = maxClipDurationSec(attachment, startSec, songDurationSec, loop, startOffsetMs);
  if (maxDuration < MIN_CLIP_SEC) return 0;
  return Math.min(Math.max(MIN_CLIP_SEC, durationSec), maxDuration);
}

export function resolveClipMove(
  attachment: SongVisualAttachmentRecord,
  clip: Pick<TimelineClip, "durationSec" | "startSec">,
  nextStartSec: number,
  songDurationSec: number,
): ClipBounds | null {
  if (!Number.isFinite(nextStartSec)) return null;

  const loop = getClipLoop(attachment);
  const playback = readClipPlayback(attachment);
  const startOffsetMs = playback.startOffsetMs ?? 0;
  const timelineStartSec = clampClipStart(nextStartSec, clip.durationSec, songDurationSec);
  const timelineDurationSec = clampDurationSec(
    attachment,
    timelineStartSec,
    clip.durationSec,
    songDurationSec,
    loop,
    startOffsetMs,
  );
  if (timelineDurationSec <= 0) return null;

  return { timelineStartSec, timelineDurationSec, startOffsetMs };
}

export function resolveClipResizeEnd(
  attachment: SongVisualAttachmentRecord,
  clip: Pick<TimelineClip, "startSec">,
  nextDurationSec: number,
  songDurationSec: number,
): ClipBounds | null {
  if (!Number.isFinite(nextDurationSec)) return null;

  const loop = getClipLoop(attachment);
  const playback = readClipPlayback(attachment);
  const startOffsetMs = playback.startOffsetMs ?? 0;
  const timelineDurationSec = clampDurationSec(
    attachment,
    clip.startSec,
    nextDurationSec,
    songDurationSec,
    loop,
    startOffsetMs,
  );
  if (timelineDurationSec <= 0) return null;

  return {
    timelineStartSec: clip.startSec,
    timelineDurationSec,
    startOffsetMs,
  };
}

export function resolveClipResizeStart(
  attachment: SongVisualAttachmentRecord,
  clip: Pick<TimelineClip, "startSec" | "endSec" | "durationSec">,
  nextStartSec: number,
  songDurationSec: number,
): ClipBounds | null {
  if (!Number.isFinite(nextStartSec)) return null;

  const loop = getClipLoop(attachment);
  const playback = readClipPlayback(attachment);
  const currentOffsetMs = playback.startOffsetMs ?? 0;
  const endSec = clip.endSec;
  const earliestStartSec = clip.startSec - currentOffsetMs / 1000;

  let timelineStartSec = Math.max(
    earliestStartSec,
    Math.min(nextStartSec, endSec - MIN_CLIP_SEC),
  );
  timelineStartSec = clampClipStart(timelineStartSec, endSec - timelineStartSec, songDurationSec);

  const deltaSec = timelineStartSec - clip.startSec;
  let startOffsetMs = Math.max(0, currentOffsetMs + Math.round(deltaSec * 1000));

  let timelineDurationSec = endSec - timelineStartSec;
  timelineDurationSec = clampDurationSec(
    attachment,
    timelineStartSec,
    timelineDurationSec,
    songDurationSec,
    loop,
    startOffsetMs,
  );
  if (timelineDurationSec <= 0) return null;

  if (!loop) {
    const maxDuration = remainingMediaSec(attachment, startOffsetMs);
    if (timelineDurationSec > maxDuration) {
      timelineDurationSec = Math.max(MIN_CLIP_SEC, maxDuration);
      timelineStartSec = endSec - timelineDurationSec;
      startOffsetMs = Math.max(0, currentOffsetMs + Math.round((timelineStartSec - clip.startSec) * 1000));
    }
  }

  timelineStartSec = clampClipStart(timelineStartSec, timelineDurationSec, songDurationSec);
  if (timelineDurationSec < MIN_CLIP_SEC) return null;

  return { timelineStartSec, timelineDurationSec, startOffsetMs };
}

export function resolveClipResetTrim(
  attachment: SongVisualAttachmentRecord,
  clip: Pick<TimelineClip, "startSec" | "endSec" | "durationSec">,
  songDurationSec: number,
): ClipBounds | null {
  const currentOffsetMs = readClipStartOffsetMs(attachment);
  if (currentOffsetMs <= 0) return null;

  const loop = getClipLoop(attachment);
  const endSec = clip.endSec;
  const offsetSec = currentOffsetMs / 1000;
  const startOffsetMs = 0;

  let timelineStartSec = Math.max(0, clip.startSec - offsetSec);
  let timelineDurationSec = endSec - timelineStartSec;
  timelineDurationSec = clampDurationSec(
    attachment,
    timelineStartSec,
    timelineDurationSec,
    songDurationSec,
    loop,
    startOffsetMs,
  );
  if (timelineDurationSec < MIN_CLIP_SEC) return null;

  timelineStartSec = clampClipStart(timelineStartSec, timelineDurationSec, songDurationSec);
  if (timelineDurationSec < MIN_CLIP_SEC) return null;

  return { timelineStartSec, timelineDurationSec, startOffsetMs };
}

export function resolveClipInsert(
  attachment: SongVisualAttachmentRecord,
  startSec: number,
  songDurationSec: number,
  opts: { loop?: boolean; durationSec?: number; startOffsetMs?: number } = {},
): ClipBounds | null {
  if (!Number.isFinite(startSec) || startSec >= songDurationSec) return null;

  const loop = opts.loop ?? getClipLoop(attachment);
  const stub = { mediaAsset: attachment.mediaAsset, playback: { loop } } as SongVisualAttachmentRecord;
  const startOffsetMs = opts.startOffsetMs ?? 0;
  const fallbackDuration = opts.durationSec ?? defaultClipDurationSec(stub, startSec, songDurationSec);
  const timelineStartSec = clampClipStart(startSec, fallbackDuration, songDurationSec);
  const timelineDurationSec = clampDurationSec(
    stub,
    timelineStartSec,
    fallbackDuration,
    songDurationSec,
    loop,
    startOffsetMs,
  );
  if (timelineDurationSec <= 0) return null;

  return { timelineStartSec, timelineDurationSec, startOffsetMs };
}

function sortAttachmentsForLayout(attachments: SongVisualAttachmentRecord[]): SongVisualAttachmentRecord[] {
  return [...attachments]
    .filter((attachment) => attachment.enabled)
    .sort((left, right) => {
      const leftStart = readClipPlayback(left).timelineStartSec;
      const rightStart = readClipPlayback(right).timelineStartSec;
      if (typeof leftStart === "number" && typeof rightStart === "number" && leftStart !== rightStart) {
        return leftStart - rightStart;
      }
      return left.order - right.order;
    });
}

function buildTimelineClip(
  attachment: SongVisualAttachmentRecord,
  startSec: number,
  songDurationSec: number,
): TimelineClip | null {
  const loop = getClipLoop(attachment);
  const naturalDurationSec = getNaturalDurationSec(attachment);
  const playback = readClipPlayback(attachment);
  const startOffsetMs = playback.startOffsetMs ?? 0;
  const storedDuration = playback.timelineDurationSec;
  const fallbackDuration = defaultClipDurationSec(attachment, startSec, songDurationSec);
  let durationSec = storedDuration ?? fallbackDuration;
  durationSec = clampDurationSec(attachment, startSec, durationSec, songDurationSec, loop, startOffsetMs);
  if (durationSec <= 0) return null;

  return {
    attachment,
    startSec,
    endSec: startSec + durationSec,
    durationSec,
    loop,
    naturalDurationSec,
  };
}

export function layoutTimelineClips(
  attachments: SongVisualAttachmentRecord[],
  songDurationSec: number,
): TimelineClip[] {
  const enabled = sortAttachmentsForLayout(attachments);
  if (enabled.length === 0 || songDurationSec <= 0) return [];

  let packCursorSec = 0;
  const clips: TimelineClip[] = [];

  for (const attachment of enabled) {
    const playback = readClipPlayback(attachment);
    const explicitStart = playback.timelineStartSec;
    const startSec = typeof explicitStart === "number"
      ? Math.max(0, explicitStart)
      : packCursorSec;

    const clip = buildTimelineClip(attachment, startSec, songDurationSec);
    if (!clip) continue;

    clips.push(clip);
    packCursorSec = Math.max(packCursorSec, clip.endSec);
  }

  return clips;
}

export function clampClipStart(
  nextStartSec: number,
  durationSec: number,
  songDurationSec: number,
): number {
  if (!Number.isFinite(nextStartSec) || !Number.isFinite(durationSec)) return 0;
  const maxStart = Math.max(0, songDurationSec - durationSec);
  return Math.min(Math.max(0, nextStartSec), maxStart);
}

export function resolveClipMoveStart(
  clip: TimelineClip,
  _allClips: TimelineClip[],
  desiredStartSec: number,
  songDurationSec: number,
): number {
  return clampClipStart(desiredStartSec, clip.durationSec, songDurationSec);
}

export function findClipsAtTime(clips: TimelineClip[], timeSec: number): TimelineClip[] {
  if (!Number.isFinite(timeSec)) return [];
  return clips
    .filter((clip) => timeSec >= clip.startSec && timeSec < clip.endSec)
    .sort((left, right) => right.attachment.order - left.attachment.order);
}

export function findTopClipAtTime(clips: TimelineClip[], timeSec: number): TimelineClip | null {
  return findClipsAtTime(clips, timeSec)[0] ?? null;
}

export type TrimClipAtResult =
  | { action: "delete" }
  | {
    action: "trim";
    timelineStartSec: number;
    timelineDurationSec: number;
    startOffsetMs: number;
  };

export function trimClipAtShortSide(
  clip: TimelineClip,
  cutSec: number,
  songDurationSec: number,
): TrimClipAtResult | null {
  if (!Number.isFinite(cutSec) || cutSec <= clip.startSec || cutSec >= clip.endSec) return null;

  const attachment = clip.attachment;
  const loop = getClipLoop(attachment);
  const playback = readClipPlayback(attachment);
  const leftDurationSec = cutSec - clip.startSec;
  const rightDurationSec = clip.endSec - cutSec;
  const currentOffsetMs = playback.startOffsetMs ?? 0;

  if (leftDurationSec < MIN_CLIP_SEC && rightDurationSec < MIN_CLIP_SEC) {
    return { action: "delete" };
  }

  let candidate: ClipBounds;

  if (leftDurationSec < MIN_CLIP_SEC) {
    candidate = {
      timelineStartSec: cutSec,
      timelineDurationSec: rightDurationSec,
      startOffsetMs: currentOffsetMs + Math.round(leftDurationSec * 1000),
    };
  } else if (rightDurationSec < MIN_CLIP_SEC) {
    candidate = {
      timelineStartSec: clip.startSec,
      timelineDurationSec: leftDurationSec,
      startOffsetMs: currentOffsetMs,
    };
  } else if (leftDurationSec <= rightDurationSec) {
    candidate = {
      timelineStartSec: cutSec,
      timelineDurationSec: rightDurationSec,
      startOffsetMs: currentOffsetMs + Math.round(leftDurationSec * 1000),
    };
  } else {
    candidate = {
      timelineStartSec: clip.startSec,
      timelineDurationSec: leftDurationSec,
      startOffsetMs: currentOffsetMs,
    };
  }

  const durationSec = clampDurationSec(
    attachment,
    candidate.timelineStartSec,
    candidate.timelineDurationSec,
    songDurationSec,
    loop,
    candidate.startOffsetMs,
  );
  if (durationSec < MIN_CLIP_SEC) return { action: "delete" };

  if (!loop && candidate.startOffsetMs / 1000 + durationSec > getNaturalDurationSec(attachment) + TIME_EPSILON_SEC) {
    return { action: "delete" };
  }

  return {
    action: "trim",
    timelineStartSec: candidate.timelineStartSec,
    timelineDurationSec: durationSec,
    startOffsetMs: candidate.startOffsetMs,
  };
}

export function canCutClipAt(clip: TimelineClip, cutSec: number, songDurationSec: number): boolean {
  return trimClipAtShortSide(clip, cutSec, songDurationSec) != null;
}

export function isPointerDrag(deltaX: number, deltaY: number): boolean {
  return Math.hypot(deltaX, deltaY) >= DRAG_CLICK_THRESHOLD_PX;
}

export function timeSecFromTimelinePointer(
  clientX: number,
  rect: Pick<DOMRect, "left" | "width">,
  durationSec: number,
): number {
  if (!Number.isFinite(durationSec) || durationSec <= 0 || rect.width <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return ratio * durationSec;
}

export function previewClipMove(
  attachment: SongVisualAttachmentRecord,
  clip: TimelineClip,
  nextStartSec: number,
  songDurationSec: number,
): { startSec: number; durationSec: number } | null {
  const bounds = resolveClipMove(attachment, clip, nextStartSec, songDurationSec);
  if (!bounds) return null;
  return { startSec: bounds.timelineStartSec, durationSec: bounds.timelineDurationSec };
}

export function previewClipResizeEnd(
  attachment: SongVisualAttachmentRecord,
  clip: TimelineClip,
  nextDurationSec: number,
  songDurationSec: number,
): { startSec: number; durationSec: number } | null {
  const bounds = resolveClipResizeEnd(attachment, clip, nextDurationSec, songDurationSec);
  if (!bounds) return null;
  return { startSec: bounds.timelineStartSec, durationSec: bounds.timelineDurationSec };
}

export function previewClipResizeStart(
  attachment: SongVisualAttachmentRecord,
  clip: TimelineClip,
  nextStartSec: number,
  songDurationSec: number,
): { startSec: number; durationSec: number } | null {
  const bounds = resolveClipResizeStart(attachment, clip, nextStartSec, songDurationSec);
  if (!bounds) return null;
  return { startSec: bounds.timelineStartSec, durationSec: bounds.timelineDurationSec };
}

export function getTimelineUsedSec(clips: TimelineClip[]): number {
  return clips.reduce((max, clip) => Math.max(max, clip.endSec), 0);
}

export function getRemainingTimelineSec(clips: TimelineClip[], songDurationSec: number): number {
  return Math.max(0, songDurationSec - getTimelineUsedSec(clips));
}

export function boundsNearlyEqual(
  left: ClipBounds,
  right: Pick<TimelineClip, "startSec" | "durationSec">,
  startOffsetMs: number,
): boolean {
  return (
    Math.abs(left.timelineStartSec - right.startSec) < TIME_EPSILON_SEC
    && Math.abs(left.timelineDurationSec - right.durationSec) < TIME_EPSILON_SEC
    && Math.abs(left.startOffsetMs - startOffsetMs) < 1
  );
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
