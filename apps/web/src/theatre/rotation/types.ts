import type { Features } from '../audio/AudioFeatureExtractor'
import type { TheatreAudioSnapshot } from '../audio/TheatreAudioBus'

export type RotationMode = 'timedMusicAware' | 'perTrack'

export type AudioGate =
  | { kind: 'beatOrChaosOrDropEdge' }
  | { kind: 'beatEdge' }
  | { kind: 'flux'; threshold: number }

export type RotationPolicyConfig = {
  mode: RotationMode
  minHoldMs: number
  targetHoldMs: number
  maxHoldMs: number
  gate: AudioGate
  pinPresetId?: string
}

export type RotationOverrideSource = 'default' | 'preset' | 'song'

export type RotationOverride = {
  mode?: RotationMode
  pinPresetId?: string
  minHoldMs?: number
  targetHoldMs?: number
  maxHoldMs?: number
  gate?: AudioGate
}

export type ResolvedRotationPolicy = RotationPolicyConfig & {
  source: RotationOverrideSource
}

export type RotationPolicyState = {
  presetStartedAtMs: number
}

export type RotationDecisionReason = 'gate' | 'force'

export type RotationDecision =
  | { action: 'hold' }
  | { action: 'preload' }
  | { action: 'rotate'; reason: RotationDecisionReason }

export type RotationPolicyInput = {
  nowMs: number
  presetStartedAtMs: number
  activePresetId?: string | null
  audio?: TheatreAudioSnapshot
  features?: Features
}

export type TheatreTrackContext = {
  segmentId?: string | null
  trackId?: string | null
}
