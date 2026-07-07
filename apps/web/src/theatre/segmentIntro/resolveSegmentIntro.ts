import { findActiveTimelineClip } from '../media/timelineClipLayout'
import {
  ALBUM_ART_INTRO_PRESET_ID,
  SEGMENT_INTRO_PRESET_TAG,
} from '../packages/album-art/presets'
import type { PickContext } from '../selection/types'
import { getPreset } from '../registry/scenePresets'

export type SegmentIntroPolicy = 'albumArt' | 'none' | 'attachedFirst'

export type SegmentIntroResolveInput = {
  artworkUrl: string | null | undefined
  pickCtx: PickContext
  introPolicy?: SegmentIntroPolicy
}

export function isSegmentIntroPreset(presetId: string | null | undefined): boolean {
  if (!presetId) return false
  const preset = getPreset(presetId)
  return preset?.tags?.includes(SEGMENT_INTRO_PRESET_TAG) ?? false
}

export function isSegmentIntroPresetExcludedFromBag(presetId: string): boolean {
  const preset = getPreset(presetId)
  if (!preset) return false
  if (preset.tags?.includes(SEGMENT_INTRO_PRESET_TAG)) return true
  return (preset.weight ?? 1) <= 0
}

function hasActiveTimelineClipAtPlayhead(pickCtx: PickContext): boolean {
  if (pickCtx.songPlayheadSec == null || !pickCtx.timelineClips?.length) return false
  return findActiveTimelineClip(pickCtx.timelineClips, pickCtx.songPlayheadSec) != null
}

/** Resolve the preset to play at segment open, or null to fall through to normal pick logic. */
export function resolveSegmentIntro(input: SegmentIntroResolveInput): string | null {
  const policy = input.introPolicy ?? 'albumArt'
  if (policy === 'none') return null

  const artwork = typeof input.artworkUrl === 'string' ? input.artworkUrl.trim() : ''
  if (!artwork) return null

  const { pickCtx } = input

  if (policy === 'attachedFirst') return null

  if (pickCtx.songVisualPolicy === 'attachedOnly' && hasActiveTimelineClipAtPlayhead(pickCtx)) {
    return null
  }

  return ALBUM_ART_INTRO_PRESET_ID
}
