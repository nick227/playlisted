import type { PickContext } from '../selection/types'

import { ATTACHED_ONLY_BLANK_PRESET_ID } from './attachedOnlyBlankPreset'
import { isTimelinePlaybackActive, resolveTimelinePresetId } from './timelineClipPick'
import type { SongVisualPolicy } from './types'

export function hasAttachedOnlyTimeline(ctx: PickContext): boolean {
  return ctx.songVisualPolicy === 'attachedOnly' && (ctx.timelineClips?.length ?? 0) > 0
}

export function blocksBuiltinSitePresets(ctx: PickContext): boolean {
  if (ctx.songVisualHydrationPending) return true
  return ctx.songVisualPolicy === 'attachedOnly'
}

export function resolveAttachedOnlyTimelinePresetId(ctx: PickContext): string | null {
  if (!hasAttachedOnlyTimeline(ctx)) return null

  const activeClipPresetId = resolveTimelinePresetId(ctx)
  if (activeClipPresetId) return activeClipPresetId

  return ATTACHED_ONLY_BLANK_PRESET_ID
}

export function resolveTimelineAwarePresetId(ctx: PickContext): string | null {
  if (isTimelinePlaybackActive(ctx)) {
    if (ctx.songVisualPolicy === 'attachedOnly') {
      return resolveAttachedOnlyTimelinePresetId(ctx)
    }
    return resolveTimelinePresetId(ctx)
  }
  return null
}

export function shouldSuppressSiteRotationInGap(ctx: PickContext): boolean {
  return ctx.songVisualPolicy === 'attachedOnly'
}

export function isAttachedOnlyPolicy(policy: SongVisualPolicy | undefined): boolean {
  return policy === 'attachedOnly'
}
