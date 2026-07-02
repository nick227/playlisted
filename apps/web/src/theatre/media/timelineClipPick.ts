import { userMediaPresetId } from './attachmentToScenePreset'
import { resolvePreset } from './resolvePreset'
import type { VisualMediaTimelineClip } from './timelineClipLayout'
import { findActiveTimelineClip, localPlayheadSec } from './timelineClipLayout'
import type { PickContext } from '../selection/types'

export function pickTimelineClipPresetId(ctx: PickContext): string | null {
  if (ctx.songPlayheadSec == null || !ctx.timelineClips?.length) return null
  const clip = findActiveTimelineClip(ctx.timelineClips, ctx.songPlayheadSec)
  return clip ? userMediaPresetId(clip.attachment.id) : null
}

export function buildTimelineVideoStartOffsetMs(
  clip: VisualMediaTimelineClip,
  playheadSec: number,
): number {
  return Math.round(localPlayheadSec(playheadSec, clip) * 1000)
}

export function isTimelinePlaybackActive(ctx: PickContext): boolean {
  return Boolean(ctx.timelineClips?.length && ctx.songPlayheadSec != null)
}

export function isUserMediaPresetId(presetId: string | null | undefined): boolean {
  return Boolean(presetId?.startsWith('user-media:'))
}

export function resolveTimelinePresetId(ctx: PickContext): string | null {
  const presetId = pickTimelineClipPresetId(ctx)
  if (!presetId || !resolvePreset(presetId)) return null
  return presetId
}
