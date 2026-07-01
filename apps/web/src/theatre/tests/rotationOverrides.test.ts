import { describe, expect, it } from 'vitest'

import {
  DEFAULT_ROTATION_POLICY_CONFIG,
  evaluateRotationPolicy,
} from '../rotation/RotationPolicy'
import {
  mergeRotationOverride,
  resolveRotationPolicy,
} from '../rotation/rotationOverrides'
import type { ScenePresetDef } from '../registry/scenePresets'

const BASE_MS = 1_000_000

function preset(overrides: Partial<ScenePresetDef> = {}): ScenePresetDef {
  return {
    id: 'testPreset',
    label: 'Test Preset',
    category: 'production',
    layers: [{ animationId: 'mock' }],
    ...overrides,
  }
}

describe('rotationOverrides', () => {
  it('returns global default when no override is present', () => {
    const resolved = resolveRotationPolicy({
      activePresetId: 'alpha',
      activePreset: preset({ id: 'alpha' }),
      track: { segmentId: 'seg-1' },
    })

    expect(resolved.source).toBe('default')
    expect(resolved.mode).toBe('timedMusicAware')
    expect(resolved.minHoldMs).toBe(DEFAULT_ROTATION_POLICY_CONFIG.minHoldMs)
    expect(resolved.targetHoldMs).toBe(DEFAULT_ROTATION_POLICY_CONFIG.targetHoldMs)
    expect(resolved.maxHoldMs).toBe(DEFAULT_ROTATION_POLICY_CONFIG.maxHoldMs)
  })

  it('applies preset override hold windows', () => {
    const resolved = resolveRotationPolicy({
      activePresetId: 'albumArtStill',
      activePreset: preset({
        id: 'albumArtStill',
        rotation: {
          minHoldMs: 45_000,
          targetHoldMs: 90_000,
          maxHoldMs: 180_000,
        },
      }),
    })

    expect(resolved.source).toBe('preset')
    expect(resolved.minHoldMs).toBe(45_000)
    expect(resolved.targetHoldMs).toBe(90_000)
    expect(resolved.maxHoldMs).toBe(180_000)
  })

  it('suppresses rotation for preset perTrack mode', () => {
    const resolved = resolveRotationPolicy({
      activePresetId: 'albumArtStill',
      activePreset: preset({
        id: 'albumArtStill',
        rotation: { mode: 'perTrack' },
      }),
    })

    const decision = evaluateRotationPolicy({
      nowMs: BASE_MS + resolved.maxHoldMs + 1,
      presetStartedAtMs: BASE_MS,
      activePresetId: 'albumArtStill',
    }, resolved)

    expect(resolved.mode).toBe('perTrack')
    expect(decision).toEqual({ action: 'hold' })
  })

  it('lets song override win over preset override', () => {
    const resolved = resolveRotationPolicy(
      {
        activePresetId: 'albumArtStill',
        activePreset: preset({
          id: 'albumArtStill',
          rotation: { minHoldMs: 45_000 },
        }),
        track: { segmentId: 'song-1' },
      },
      {
        resolveSongOverride: () => ({ minHoldMs: 10_000, mode: 'perTrack' }),
      },
    )

    expect(resolved.source).toBe('song')
    expect(resolved.minHoldMs).toBe(10_000)
    expect(resolved.mode).toBe('perTrack')
  })

  it('suppresses rotation when active preset matches pinPresetId', () => {
    const resolved = resolveRotationPolicy({
      activePresetId: 'pinnedFx',
      activePreset: preset({
        id: 'pinnedFx',
        rotation: { pinPresetId: 'pinnedFx' },
      }),
    })

    const decision = evaluateRotationPolicy({
      nowMs: BASE_MS + resolved.maxHoldMs + 1,
      presetStartedAtMs: BASE_MS,
      activePresetId: 'pinnedFx',
    }, resolved)

    expect(decision).toEqual({ action: 'hold' })
  })

  it('falls back to defaults for invalid override values', () => {
    const merged = mergeRotationOverride(DEFAULT_ROTATION_POLICY_CONFIG, {
      minHoldMs: -500,
      targetHoldMs: Number.NaN,
      maxHoldMs: -1,
      gate: { kind: 'flux', threshold: -1 },
      mode: 'invalid' as never,
      pinPresetId: '   ',
    })

    expect(merged.minHoldMs).toBe(DEFAULT_ROTATION_POLICY_CONFIG.minHoldMs)
    expect(merged.targetHoldMs).toBe(DEFAULT_ROTATION_POLICY_CONFIG.targetHoldMs)
    expect(merged.maxHoldMs).toBe(DEFAULT_ROTATION_POLICY_CONFIG.maxHoldMs)
    expect(merged.mode).toBe(DEFAULT_ROTATION_POLICY_CONFIG.mode)
    expect(merged.gate).toEqual(DEFAULT_ROTATION_POLICY_CONFIG.gate)
    expect(merged.pinPresetId).toBeUndefined()
  })
})
