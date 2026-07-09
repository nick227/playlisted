import type {
  BeatFxEffect,
  BeatFxIntensity,
  SongAtmosphereFx,
  SongVisualPolicy,
  TrackVisualMediaResolution,
  VisualMediaAttachment,
  VisualMediaBeatFx,
  VisualMediaPlayback,
} from './types'

const MAX_START_OFFSET_MS = 86_400_000
const MAX_TIMELINE_SEC = 86_400
const VALID_OBJECT_FITS = new Set<NonNullable<VisualMediaPlayback['objectFit']>>(['cover', 'contain'])
const VALID_BEAT_FX_INTENSITIES = new Set<BeatFxIntensity>(['subtle', 'normal', 'strong'])
const VALID_BEAT_FX_EFFECTS = new Set<BeatFxEffect>(['scale', 'brightness', 'dropPunch'])
const VALID_ATMOSPHERE_MODES = new Set<SongAtmosphereFx['mode']>(['inherit', 'off', 'subtle', 'normal', 'strong'])
const MAX_ATMOSPHERE_PRESET_ID = 128

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function clampNonNegativeMs(value: unknown): number | undefined {
  if (!finiteNumber(value) || value < 0) return undefined
  return Math.min(Math.round(value), MAX_START_OFFSET_MS)
}

function clampTimelineSec(value: unknown): number | undefined {
  if (!finiteNumber(value) || value < 0) return undefined
  return Math.min(value, MAX_TIMELINE_SEC)
}

function sanitizeBeatFx(value: VisualMediaBeatFx | null | undefined): VisualMediaBeatFx | undefined {
  if (!value || typeof value !== 'object') return undefined

  const next: VisualMediaBeatFx = {}
  if (typeof value.enabled === 'boolean') next.enabled = value.enabled
  if (typeof value.intensity === 'string' && VALID_BEAT_FX_INTENSITIES.has(value.intensity)) {
    next.intensity = value.intensity
  }
  if (Array.isArray(value.effects)) {
    const effects = value.effects.filter((effect): effect is BeatFxEffect =>
      typeof effect === 'string' && VALID_BEAT_FX_EFFECTS.has(effect as BeatFxEffect),
    )
    if (effects.length > 0) next.effects = [...new Set(effects)]
  }

  return Object.keys(next).length > 0 ? next : undefined
}

function sanitizeAtmosphereFx(value: SongAtmosphereFx | null | undefined): SongAtmosphereFx | null {
  if (!value || typeof value !== 'object') return null
  if (typeof value.mode !== 'string' || !VALID_ATMOSPHERE_MODES.has(value.mode)) return null
  let presetId: string | null = null
  if (typeof value.presetId === 'string') {
    const trimmed = value.presetId.trim().slice(0, MAX_ATMOSPHERE_PRESET_ID)
    presetId = trimmed.length > 0 ? trimmed : null
  } else if (value.presetId === null) {
    presetId = null
  }
  return { mode: value.mode, presetId }
}

export type SongVisualMediaApiResponse = {
  songId: string
  recordingId: string
  policy: SongVisualPolicy
  atmosphereFx?: SongAtmosphereFx | null
  attachments: Array<{
    id: string
    songId: string
    recordingId: string
    mediaAssetId: string
    policy: SongVisualPolicy
    weight: number
    order: number
    label: string | null
    enabled: boolean
    playback: VisualMediaPlayback | null
    rotation: Record<string, unknown> | null
    beatFx: VisualMediaBeatFx | null
    tags: string[] | null
    mediaAsset: {
      id: string
      mediaType: 'image' | 'video'
      url: string
      thumbnailUrl: string | null
      originalName: string
      durationMs?: number | null
    }
  }>
}

function mapPlayback(value: VisualMediaPlayback | null | undefined): VisualMediaPlayback | undefined {
  if (!value || typeof value !== 'object') return undefined

  const next: VisualMediaPlayback = {}
  if (typeof value.loop === 'boolean') next.loop = value.loop
  if (typeof value.muted === 'boolean') next.muted = value.muted
  if (typeof value.objectFit === 'string' && VALID_OBJECT_FITS.has(value.objectFit)) {
    next.objectFit = value.objectFit
  }

  const startOffsetMs = clampNonNegativeMs(value.startOffsetMs)
  if (startOffsetMs != null) next.startOffsetMs = startOffsetMs

  const timelineStartSec = clampTimelineSec(value.timelineStartSec)
  if (timelineStartSec != null) next.timelineStartSec = timelineStartSec

  const timelineDurationSec = clampTimelineSec(value.timelineDurationSec)
  if (timelineDurationSec != null) next.timelineDurationSec = timelineDurationSec

  return Object.keys(next).length > 0 ? next : undefined
}

function resolveAttachmentPolicy(
  attachments: SongVisualMediaApiResponse['attachments'],
  fallback: SongVisualPolicy | null | undefined,
): SongVisualPolicy {
  const enabled = attachments.filter(item => item.enabled)
  if (enabled.length === 0) return 'defaultOnly'

  const policies = enabled.map(item => item.policy)
  if (policies.includes('attachedOnly')) return 'attachedOnly'
  if (policies.includes('mixAttachedAndDefault')) return 'mixAttachedAndDefault'
  return fallback ?? 'preferAttached'
}

export function mapSongVisualMediaApiResponse(
  response: SongVisualMediaApiResponse,
): TrackVisualMediaResolution {
  const attachments: VisualMediaAttachment[] = response.attachments
    .filter(item => item.enabled)
    .sort((a, b) => a.order - b.order)
    .map(item => ({
      id: item.id,
      songId: response.songId,
      trackId: response.recordingId,
      mediaType: item.mediaAsset.mediaType,
      url: item.mediaAsset.url,
      thumbnailUrl: item.mediaAsset.thumbnailUrl ?? undefined,
      label: item.label ?? item.mediaAsset.originalName,
      weight: item.weight,
      order: item.order,
      enabled: item.enabled,
      durationMs: item.mediaAsset.durationMs ?? null,
      tags: item.tags ?? undefined,
      playback: mapPlayback(item.playback),
      rotation: item.rotation ?? undefined,
      beatFx: sanitizeBeatFx(item.beatFx),
    }))

  return {
    attachments,
    policy: resolveAttachmentPolicy(response.attachments, response.policy),
    atmosphereFx: sanitizeAtmosphereFx(response.atmosphereFx),
  }
}
