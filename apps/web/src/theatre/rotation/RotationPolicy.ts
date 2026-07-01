import type { Features } from '../audio/AudioFeatureExtractor'
import type { TheatreAudioSnapshot } from '../audio/TheatreAudioBus'
import type {
  AudioGate,
  ResolvedRotationPolicy,
  RotationDecision,
  RotationPolicyConfig,
  RotationPolicyInput,
  RotationPolicyState,
} from './types'

export const DEFAULT_FLUX_GATE_THRESHOLD = 0.02
export const LEGACY_EXTERNAL_ROTATE_MIN_MS = 8_000

export const DEFAULT_ROTATION_POLICY_CONFIG: RotationPolicyConfig = {
  mode: 'timedMusicAware',
  minHoldMs: 45_000,
  targetHoldMs: 90_000,
  maxHoldMs: 150_000,
  gate: { kind: 'beatOrChaosOrDropEdge' },
}

/** @deprecated Prefer DEFAULT_ROTATION_POLICY_CONFIG */
export const LEGACY_ROTATION_COMPAT = {
  minSceneMs: DEFAULT_ROTATION_POLICY_CONFIG.minHoldMs,
  maxSceneMs: DEFAULT_ROTATION_POLICY_CONFIG.maxHoldMs,
  clipLengthBias: 'minimum' as const,
  varianceMs: 1_000,
  requireAudioPop: true,
}

export function createRotationPolicyState(nowMs = 0): RotationPolicyState {
  return { presetStartedAtMs: nowMs }
}

export function matchesAudioGate(
  gate: AudioGate,
  audio?: TheatreAudioSnapshot,
  features?: Features,
): boolean {
  if (gate.kind === 'beatOrChaosOrDropEdge') {
    const edges = audio?.edges
    return Boolean(edges?.beat || edges?.chaosHit || edges?.drop)
  }

  if (gate.kind === 'beatEdge') {
    return Boolean(audio?.edges.beat)
  }

  const flux = features?.flux.overall ?? 0
  return flux > gate.threshold
}

export function evaluateRotationPolicy(
  input: RotationPolicyInput,
  config: RotationPolicyConfig | ResolvedRotationPolicy = DEFAULT_ROTATION_POLICY_CONFIG,
): RotationDecision {
  if (shouldSuppressRotation(input, config)) {
    return { action: 'hold' }
  }

  const elapsed = input.nowMs - input.presetStartedAtMs

  if (elapsed < config.minHoldMs) {
    return { action: 'hold' }
  }

  if (elapsed >= config.maxHoldMs) {
    return { action: 'rotate', reason: 'force' }
  }

  if (matchesAudioGate(config.gate, input.audio, input.features)) {
    return { action: 'rotate', reason: 'gate' }
  }

  if (elapsed >= config.targetHoldMs) {
    return { action: 'preload' }
  }

  return { action: 'hold' }
}

function shouldSuppressRotation(
  input: RotationPolicyInput,
  config: RotationPolicyConfig,
): boolean {
  if (config.mode === 'perTrack') return true

  if (config.pinPresetId && input.activePresetId === config.pinPresetId) return true

  return false
}

export class RotationPolicy {
  constructor(public readonly config: RotationPolicyConfig = DEFAULT_ROTATION_POLICY_CONFIG) {}

  evaluate(
    input: RotationPolicyInput,
    resolved: ResolvedRotationPolicy = this.config,
  ): RotationDecision {
    return evaluateRotationPolicy(input, resolved)
  }
}
