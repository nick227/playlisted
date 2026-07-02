import type { VisualMediaAttachment, VisualMediaPlayback } from './types'

export type VisualMediaTimelineClip = {
  attachment: VisualMediaAttachment
  startSec: number
  endSec: number
  durationSec: number
  loop: boolean
  naturalDurationSec: number
}

const IMAGE_NATURAL_SEC = 8
const VIDEO_FALLBACK_NATURAL_SEC = 30
const MIN_CLIP_SEC = 0.5

export function readClipPlayback(attachment: VisualMediaAttachment): VisualMediaPlayback {
  const playback = attachment.playback
  if (!playback || typeof playback !== 'object') {
    return { loop: attachment.mediaType === 'video' }
  }
  return playback
}

export function getNaturalDurationSec(attachment: VisualMediaAttachment): number {
  const durationMs = attachment.durationMs
  if (durationMs && durationMs > 0) return durationMs / 1000
  return attachment.mediaType === 'video' ? VIDEO_FALLBACK_NATURAL_SEC : IMAGE_NATURAL_SEC
}

export function getClipLoop(attachment: VisualMediaAttachment): boolean {
  const playback = readClipPlayback(attachment)
  return playback.loop ?? attachment.mediaType === 'video'
}

export function maxClipDurationSec(
  attachment: VisualMediaAttachment,
  startSec: number,
  songDurationSec: number,
  loop: boolean,
): number {
  const remaining = Math.max(0, songDurationSec - startSec)
  if (loop) return remaining
  return Math.min(getNaturalDurationSec(attachment), remaining)
}

export function defaultClipDurationSec(
  attachment: VisualMediaAttachment,
  startSec: number,
  songDurationSec: number,
): number {
  const loop = getClipLoop(attachment)
  const remaining = Math.max(0, songDurationSec - startSec)
  if (remaining <= 0) return 0
  const natural = getNaturalDurationSec(attachment)
  if (loop) return remaining
  return Math.min(natural, remaining)
}

export function layoutTimelineClips(
  attachments: VisualMediaAttachment[],
  songDurationSec: number,
): VisualMediaTimelineClip[] {
  const enabled = attachments
    .filter((attachment) => attachment.enabled !== false)
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))

  if (enabled.length === 0 || songDurationSec <= 0) return []

  let cursorSec = 0
  const clips: VisualMediaTimelineClip[] = []

  for (const attachment of enabled) {
    if (cursorSec >= songDurationSec - MIN_CLIP_SEC) break

    const loop = getClipLoop(attachment)
    const naturalDurationSec = getNaturalDurationSec(attachment)
    const playback = readClipPlayback(attachment)
    const storedDuration = playback.timelineDurationSec
    const maxDuration = maxClipDurationSec(attachment, cursorSec, songDurationSec, loop)
    const fallbackDuration = defaultClipDurationSec(attachment, cursorSec, songDurationSec)
    let durationSec = storedDuration ?? fallbackDuration
    durationSec = Math.min(Math.max(MIN_CLIP_SEC, durationSec), maxDuration)
    if (durationSec <= 0) break

    clips.push({
      attachment: {
        ...attachment,
        playback: {
          ...playback,
          timelineStartSec: cursorSec,
          timelineDurationSec: durationSec,
          loop,
        },
      },
      startSec: cursorSec,
      endSec: cursorSec + durationSec,
      durationSec,
      loop,
      naturalDurationSec,
    })
    cursorSec += durationSec
  }

  return clips
}

export function findActiveTimelineClip(
  clips: VisualMediaTimelineClip[],
  playheadSec: number,
): VisualMediaTimelineClip | null {
  return clips.find((clip) => playheadSec >= clip.startSec && playheadSec < clip.endSec) ?? null
}

export function getRemainingTimelineSec(clips: VisualMediaTimelineClip[], songDurationSec: number): number {
  const usedSec = clips.at(-1)?.endSec ?? 0
  return Math.max(0, songDurationSec - usedSec)
}

export function hasTimelineLayout(clips: VisualMediaTimelineClip[]): boolean {
  return clips.length > 0
}

export function localPlayheadSec(playheadSec: number, clip: VisualMediaTimelineClip): number {
  const elapsed = Math.max(0, playheadSec - clip.startSec)
  if (!clip.loop) return Math.min(elapsed, clip.naturalDurationSec)
  const span = Math.max(clip.naturalDurationSec, 0.001)
  return elapsed % span
}
