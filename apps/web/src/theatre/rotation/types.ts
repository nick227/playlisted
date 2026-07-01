import type { Features } from '../audio/AudioFeatureExtractor'
import type { TheatreAudioSnapshot } from '../audio/TheatreAudioBus'

export type RotationMode = 'timedMusicAware'

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
  audio?: TheatreAudioSnapshot
  features?: Features
}
