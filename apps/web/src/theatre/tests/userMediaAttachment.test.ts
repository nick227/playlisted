import { describe, expect, it, vi, beforeEach } from 'vitest'

import registry from '../registry'
import { registerUserMediaEngine } from '../media/userMediaEngine'
import {
  attachmentToScenePreset,
  userMediaPresetId,
} from '../media/attachmentToScenePreset'
import { clearDynamicPresets, getDynamicPreset } from '../media/dynamicPresetStore'
import { buildSongVisualPickExtras } from '../media/buildSongVisualPool'
import { resolvePreset } from '../media/resolvePreset'
import {
  registerLocalTrackVisualMedia,
  resolveTrackVisualMedia,
} from '../media/resolveTrackVisualMedia'
import type { VisualMediaAttachment } from '../media/types'
import { DEFAULT_ROTATION_POLICY_CONFIG, evaluateRotationPolicy } from '../rotation/RotationPolicy'
import { resolveRotationPolicy } from '../rotation/rotationOverrides'
import { FxSelector } from '../selection/FxSelector'
import type { WeightedFamilyCatalogEntry } from '../selection/catalogVersion'
import type { FxBagStorage, FxBagStorageState } from '../selection/fxBagStorage'
import type { PickContext } from '../selection/types'

const TEST_FAMILIES: WeightedFamilyCatalogEntry[] = [
  {
    familyId: 'test-family',
    familyWeight: 1,
    presets: [{ id: 'alpha', weight: 1 }, { id: 'beta', weight: 1 }],
  },
]

vi.mock('../registry/scenePresets', () => ({
  getPreset: (id: string) => ({
    id,
    label: id,
    category: 'production',
    layers: [{ animationId: 'mock' }],
  }),
}))

vi.mock('../controller/presetQuarantine', () => ({
  isPresetQuarantined: () => false,
}))

const TEST_VERSION = 'user-media-test-v1'

function sampleAttachment(overrides: Partial<VisualMediaAttachment> = {}): VisualMediaAttachment {
  return {
    id: 'clip-a',
    mediaType: 'video',
    url: '/uploads/user/clip-a.mp4',
    label: 'User Clip A',
    playback: { loop: true, muted: true, objectFit: 'cover' },
    weight: 1,
    ...overrides,
  }
}

function createMemoryStorage(initial: FxBagStorageState | null = null) {
  let value = initial
  const storage: FxBagStorage = {
    read: () => value,
    write: state => { value = state },
    remove: () => { value = null },
  }
  return { storage, get: () => value }
}

function createSelector(storage: FxBagStorage) {
  return new FxSelector({
    storage,
    catalogVersion: TEST_VERSION,
    getCatalogFamilies: () => TEST_FAMILIES,
    isValidPresetId: id => id === 'alpha' || id === 'beta' || id.startsWith('user-media:'),
  })
}

describe('VisualMediaAttachment foundation', () => {
  beforeEach(() => {
    clearDynamicPresets()
    registerUserMediaEngine()
  })

  it('converts attachments into dynamic video presets', () => {
    const preset = attachmentToScenePreset(sampleAttachment())

    expect(preset.id).toBe(userMediaPresetId('clip-a'))
    expect(preset.layers[0]?.animationId).toBe('userVideoMedia')
    expect(preset.layers[0]?.options?.videoUrl).toBe('/uploads/user/clip-a.mp4')
    expect(preset.layers[0]?.options?.loop).toBe(true)
    expect(preset.rotation?.mode).toBe('timedMusicAware')
    expect(preset.tags).toContain('user-media')
  })

  it('resolveTrackVisualMedia returns empty for tracks without attachments', () => {
    expect(resolveTrackVisualMedia(null)).toEqual({
      attachments: [],
      policy: 'defaultOnly',
    })
    expect(resolveTrackVisualMedia({ trackId: 'unknown-track' }).attachments).toEqual([])
  })

  it('resolveTrackVisualMedia reads local stub attachments by track id', () => {
    registerLocalTrackVisualMedia('song-123', [
      sampleAttachment({ id: 'clip-a' }),
      sampleAttachment({ id: 'clip-b', url: '/uploads/user/clip-b.mp4' }),
    ])

    const resolved = resolveTrackVisualMedia({ trackId: 'song-123' })
    expect(resolved.attachments).toHaveLength(2)
    expect(resolved.policy).toBe('preferAttached')
  })

  it('resolvePreset finds synced dynamic presets', () => {
    const preset = attachmentToScenePreset(sampleAttachment())
    buildSongVisualPickExtras({ trackId: 'song-123' })
    registerLocalTrackVisualMedia('song-123', [sampleAttachment()])

    const extras = buildSongVisualPickExtras({ trackId: 'song-123' })
    expect(extras.dynamicPresets).toHaveLength(1)
    expect(resolvePreset(extras.dynamicPresets[0]!.id)?.layers[0]?.animationId).toBe('userVideoMedia')
    expect(getDynamicPreset(preset.id)).not.toBeNull()
  })

  it('FxSelector prefers attached media when track has attachments', () => {
    registerLocalTrackVisualMedia('song-456', [sampleAttachment({ id: 'clip-a' })])
    const extras = buildSongVisualPickExtras({ trackId: 'song-456' })

    const memory = createMemoryStorage({
      version: TEST_VERSION,
      bag: ['alpha', 'beta'],
      updatedAt: Date.now(),
    })
    const selector = createSelector(memory.storage)

    const picked = selector.consumeNext({
      reducedMotion: false,
      activePresetId: null,
      ...extras,
    })

    expect(picked?.id).toBe(userMediaPresetId('clip-a'))
    expect(memory.get()?.bag).toEqual(['alpha', 'beta'])
  })

  it('FxSelector keeps built-in behavior when no attachments exist', () => {
    const memory = createMemoryStorage({
      version: TEST_VERSION,
      bag: ['alpha', 'beta'],
      updatedAt: Date.now(),
    })
    const selector = createSelector(memory.storage)
    const ctx: PickContext = {
      reducedMotion: false,
      activePresetId: null,
      ...buildSongVisualPickExtras(null),
    }

    expect(selector.consumeNext(ctx)?.id).toBe('alpha')
    expect(memory.get()?.bag).toEqual(['beta'])
  })

  it('RotationPolicy still governs dynamic preset timing metadata', () => {
    const preset = attachmentToScenePreset(sampleAttachment({
      rotation: { minHoldMs: 50_000, targetHoldMs: 100_000, maxHoldMs: 160_000 },
    }))

    const resolved = resolveRotationPolicy({
      activePresetId: preset.id,
      activePreset: preset,
      track: { trackId: 'song-123' },
    })

    expect(resolved.source).toBe('preset')
    expect(resolved.minHoldMs).toBe(50_000)

    const hold = evaluateRotationPolicy({
      nowMs: 1_050_000,
      presetStartedAtMs: 1_000_000,
    }, resolved)
    expect(hold).toEqual({ action: 'hold' })
  })

  it('registers user media engine animations in the registry', () => {
    expect(registry.get('userVideoMedia')?.visualType).toBe('video')
    expect(registry.get('userImageMedia')?.visualType).toBe('image')
  })

  it('defaults dynamic presets to timedMusicAware rotation, not perTrack', () => {
    const preset = attachmentToScenePreset(sampleAttachment())
    expect(preset.rotation?.mode).toBe('timedMusicAware')
    expect(preset.rotation?.mode).not.toBe('perTrack')
    expect(DEFAULT_ROTATION_POLICY_CONFIG.minHoldMs).toBeGreaterThan(0)
  })
})
