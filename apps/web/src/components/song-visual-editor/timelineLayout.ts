import type { SongVisualAttachmentRecord } from "@/lib/visualMediaApi";
import type { VisualMediaPlayback } from "@/theatre/media/types";

import type { TimelineClip } from "./types";

const IMAGE_NATURAL_SEC = 8;
const VIDEO_FALLBACK_NATURAL_SEC = 30;
export const MIN_CLIP_SEC = 0.5;
const DRAG_CLICK_THRESHOLD_PX = 4;

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
  // Loop on: fill available timeline from this clip's start (first clip = whole song).
  // Loop off: never stretch beyond natural media duration.
  if (loop) return remaining;
  return Math.min(natural, remaining);
}

export function clipDurationAfterLoopChange(
  attachment: SongVisualAttachmentRecord,
  startSec: number,
  songDurationSec: number,
  loop: boolean,
  currentDurationSec?: number,
): number {
  const maxDuration = maxClipDurationSec(attachment, startSec, songDurationSec, loop);
  if (loop) return maxDuration;
  const naturalCap = Math.min(getNaturalDurationSec(attachment), maxDuration);
  if (currentDurationSec == null) return naturalCap;
  return Math.min(currentDurationSec, naturalCap);
}

export function usesExplicitTimelineLayout(attachments: SongVisualAttachmentRecord[]): boolean {
  return attachments.some((attachment) => {
    if (!attachment.enabled) return false;
    return typeof readClipPlayback(attachment).timelineStartSec === "number";
  });
}

function sortAttachmentsForLayout(attachments: SongVisualAttachmentRecord[]): SongVisualAttachmentRecord[] {
  const enabled = attachments.filter((attachment) => attachment.enabled);
  if (usesExplicitTimelineLayout(enabled)) {
    return [...enabled].sort((left, right) => {
      const leftStart = readClipPlayback(left).timelineStartSec ?? 0;
      const rightStart = readClipPlayback(right).timelineStartSec ?? 0;
      if (leftStart !== rightStart) return leftStart - rightStart;
      return left.order - right.order;
    });
  }
  return [...enabled].sort((left, right) => left.order - right.order);
}

function buildTimelineClip(
  attachment: SongVisualAttachmentRecord,
  startSec: number,
  songDurationSec: number,
): TimelineClip | null {
  const loop = getClipLoop(attachment);
  const naturalDurationSec = getNaturalDurationSec(attachment);
  const playback = readClipPlayback(attachment);
  const storedDuration = playback.timelineDurationSec;
  const maxDuration = maxClipDurationSec(attachment, startSec, songDurationSec, loop);
  const fallbackDuration = defaultClipDurationSec(attachment, startSec, songDurationSec);
  let durationSec = storedDuration ?? fallbackDuration;
  durationSec = Math.min(Math.max(MIN_CLIP_SEC, durationSec), maxDuration);
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

  if (usesExplicitTimelineLayout(enabled)) {
    const clips: TimelineClip[] = [];
    for (const attachment of enabled) {
      const playback = readClipPlayback(attachment);
      const startSec = playback.timelineStartSec ?? 0;
      const clip = buildTimelineClip(attachment, startSec, songDurationSec);
      if (clip) clips.push(clip);
    }
    return clips;
  }

  let cursorSec = 0;
  const clips: TimelineClip[] = [];
  for (const attachment of enabled) {
    if (cursorSec >= songDurationSec - MIN_CLIP_SEC) break;
    const clip = buildTimelineClip(attachment, cursorSec, songDurationSec);
    if (!clip) break;
    clips.push(clip);
    cursorSec += clip.durationSec;
  }
  return clips;
}

export function clampClipStart(
  nextStartSec: number,
  durationSec: number,
  songDurationSec: number,
): number {
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

export function trimClipAtShortSide(clip: TimelineClip, cutSec: number): TrimClipAtResult | null {
  if (cutSec <= clip.startSec || cutSec >= clip.endSec) return null;

  const playback = readClipPlayback(clip.attachment);
  const leftDurationSec = cutSec - clip.startSec;
  const rightDurationSec = clip.endSec - cutSec;
  const currentOffsetMs = playback.startOffsetMs ?? 0;

  if (leftDurationSec < MIN_CLIP_SEC && rightDurationSec < MIN_CLIP_SEC) {
    return { action: "delete" };
  }

  if (leftDurationSec < MIN_CLIP_SEC) {
    return {
      action: "trim",
      timelineStartSec: cutSec,
      timelineDurationSec: rightDurationSec,
      startOffsetMs: currentOffsetMs + Math.round(leftDurationSec * 1000),
    };
  }

  if (rightDurationSec < MIN_CLIP_SEC) {
    return {
      action: "trim",
      timelineStartSec: clip.startSec,
      timelineDurationSec: leftDurationSec,
      startOffsetMs: currentOffsetMs,
    };
  }

  if (leftDurationSec <= rightDurationSec) {
    return {
      action: "trim",
      timelineStartSec: cutSec,
      timelineDurationSec: rightDurationSec,
      startOffsetMs: currentOffsetMs + Math.round(leftDurationSec * 1000),
    };
  }

  return {
    action: "trim",
    timelineStartSec: clip.startSec,
    timelineDurationSec: leftDurationSec,
    startOffsetMs: currentOffsetMs,
  };
}

export function canCutClipAt(clip: TimelineClip, cutSec: number): boolean {
  return trimClipAtShortSide(clip, cutSec) != null;
}

export function splitClipAt(
  clip: TimelineClip,
  cutSec: number,
): { leftDurationSec: number; rightDurationSec: number; rightStartOffsetMs: number } | null {
  const trim = trimClipAtShortSide(clip, cutSec);
  if (!trim || trim.action === "delete") return null;

  const leftDurationSec = cutSec - clip.startSec;
  const rightDurationSec = clip.endSec - cutSec;
  const playback = readClipPlayback(clip.attachment);
  const currentOffsetMs = playback.startOffsetMs ?? 0;
  const rightStartOffsetMs = currentOffsetMs + Math.round(leftDurationSec * 1000);

  return { leftDurationSec, rightDurationSec, rightStartOffsetMs };
}

export function isPointerDrag(deltaX: number, deltaY: number): boolean {
  return Math.hypot(deltaX, deltaY) >= DRAG_CLICK_THRESHOLD_PX;
}

export function timeSecFromTimelinePointer(
  clientX: number,
  rect: Pick<DOMRect, "left" | "width">,
  durationSec: number,
): number {
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return ratio * durationSec;
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
