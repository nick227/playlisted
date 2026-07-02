import type { AudioSensitivity } from '../registry/scenePresets'
import type { RotationOverride } from '../rotation/types'

export type VisualMediaType = 'video' | 'image'

export type BeatFxIntensity = 'subtle' | 'normal' | 'strong'

export type BeatFxEffect = 'scale' | 'brightness' | 'dropPunch'

export type VisualMediaBeatFx = {
  enabled?: boolean
  intensity?: BeatFxIntensity
  effects?: BeatFxEffect[]
}

export type VisualMediaPlayback = {
  loop?: boolean
  muted?: boolean
  objectFit?: 'cover' | 'contain'
  startOffsetMs?: number
  timelineStartSec?: number
  timelineDurationSec?: number
}

export type VisualMediaAttachment = {
  id: string
  songId?: string
  trackId?: string
  mediaType: VisualMediaType
  url: string
  thumbnailUrl?: string
  label?: string
  playback?: VisualMediaPlayback
  rotation?: RotationOverride
  beatFx?: VisualMediaBeatFx
  weight?: number
  order?: number
  enabled?: boolean
  durationMs?: number | null
  tags?: string[]
}

export type SongVisualPolicy =
  | 'defaultOnly'
  | 'preferAttached'
  | 'attachedOnly'
  | 'mixAttachedAndDefault'

export type TrackVisualMediaResolution = {
  attachments: VisualMediaAttachment[]
  policy: SongVisualPolicy
  audioSensitivity?: AudioSensitivity
}
