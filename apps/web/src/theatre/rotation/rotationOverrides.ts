import type { ScenePresetDef } from '../registry/scenePresets'
import {
  DEFAULT_ROTATION_POLICY_CONFIG,
} from './RotationPolicy'
import type {
  AudioGate,
  ResolvedRotationPolicy,
  RotationOverride,
  RotationOverrideSource,
  RotationPolicyConfig,
  TheatreTrackContext,
} from './types'

export type RotationResolveContext = {
  activePresetId?: string | null
  activePreset?: ScenePresetDef | null
  track?: TheatreTrackContext | null
}

export type SongRotationOverrideResolver = (
  track: TheatreTrackContext | null | undefined,
) => RotationOverride | undefined

/** Stub — returns undefined until song-specific mappings exist. */
export const resolveSongRotationOverride: SongRotationOverrideResolver = () => undefined

export function overrideFromPreset(
  preset: ScenePresetDef | null | undefined,
): RotationOverride | undefined {
  if (!preset?.rotation) return undefined
  return preset.rotation
}

function sanitizeHoldMs(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return fallback
  return value
}

function sanitizeGate(value: unknown, fallback: AudioGate): AudioGate {
  if (!value || typeof value !== 'object') return fallback

  const gate = value as AudioGate
  if (gate.kind === 'beatOrChaosOrDropEdge' || gate.kind === 'beatEdge') return gate

  if (gate.kind === 'flux') {
    const threshold = gate.threshold
    if (typeof threshold === 'number' && Number.isFinite(threshold) && threshold >= 0) {
      return { kind: 'flux', threshold }
    }
  }

  return fallback
}

function sanitizeMode(value: unknown, fallback: RotationPolicyConfig['mode']): RotationPolicyConfig['mode'] {
  if (value === 'timedMusicAware' || value === 'perTrack') return value
  return fallback
}

function sanitizePinPresetId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function mergeRotationOverride(
  base: RotationPolicyConfig,
  override?: RotationOverride,
): RotationPolicyConfig {
  if (!override) return normalizeHoldWindows({ ...base })

  const merged: RotationPolicyConfig = {
    mode: sanitizeMode(override.mode, base.mode),
    minHoldMs: sanitizeHoldMs(override.minHoldMs, base.minHoldMs),
    targetHoldMs: sanitizeHoldMs(override.targetHoldMs, base.targetHoldMs),
    maxHoldMs: sanitizeHoldMs(override.maxHoldMs, base.maxHoldMs),
    gate: sanitizeGate(override.gate, base.gate),
    pinPresetId: sanitizePinPresetId(override.pinPresetId) ?? base.pinPresetId,
  }

  return normalizeHoldWindows(merged)
}

export function normalizeHoldWindows(config: RotationPolicyConfig): RotationPolicyConfig {
  let minHoldMs = config.minHoldMs
  let targetHoldMs = config.targetHoldMs
  let maxHoldMs = config.maxHoldMs

  if (minHoldMs > targetHoldMs) targetHoldMs = minHoldMs
  if (targetHoldMs > maxHoldMs) maxHoldMs = targetHoldMs
  if (minHoldMs > maxHoldMs) minHoldMs = maxHoldMs

  return {
    ...config,
    minHoldMs,
    targetHoldMs,
    maxHoldMs,
  }
}

export function resolveRotationPolicy(
  ctx: RotationResolveContext,
  opts?: {
    base?: RotationPolicyConfig
    resolveSongOverride?: SongRotationOverrideResolver
  },
): ResolvedRotationPolicy {
  const base = opts?.base ?? DEFAULT_ROTATION_POLICY_CONFIG
  const resolveSong = opts?.resolveSongOverride ?? resolveSongRotationOverride

  const presetOverride = overrideFromPreset(ctx.activePreset)
  const songOverride = resolveSong(ctx.track)

  let source: RotationOverrideSource = 'default'
  let appliedOverride: RotationOverride | undefined

  if (songOverride) {
    source = 'song'
    appliedOverride = songOverride
  } else if (presetOverride) {
    source = 'preset'
    appliedOverride = presetOverride
  }

  const config = mergeRotationOverride(base, appliedOverride)

  if (
    appliedOverride?.pinPresetId === undefined &&
    config.mode === 'perTrack' &&
    ctx.activePresetId
  ) {
    config.pinPresetId = ctx.activePresetId
  }

  return { ...config, source }
}

export type {
  ResolvedRotationPolicy,
  RotationOverride,
  RotationOverrideSource,
} from './types'
