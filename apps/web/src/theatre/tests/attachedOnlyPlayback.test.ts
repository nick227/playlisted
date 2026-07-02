import { describe, expect, it, vi, beforeEach } from 'vitest'

import { registerUserMediaEngine } from '../media/userMediaEngine'
import {
  ATTACHED_ONLY_BLANK_PRESET_ID,
  ensureAttachedOnlyBlankPreset,
  registerAttachedOnlyBlankEngine,
} from '../media/attachedOnlyBlankPreset'
import { buildSongVisualPickExtras } from '../media/buildSongVisualPool'
import { clearDynamicPresets } from '../media/dynamicPresetStore'
import { userMediaPresetId } from '../media/attachmentToScenePreset'
import { resolvePreset } from '../media/resolvePreset'
import {
  registerLocalTrackVisualMedia,
} from '../media/resolveTrackVisualMedia'
import { pickTimelineClipPresetId } from '../media/timelineClipPick'
import type { VisualMediaAttachment } from '../media/types'
import { FxSelector } from '../selection/FxSelector'
import type { WeightedFamilyCatalogEntry } from '../selection/catalogVersion'
import type { FxBagStorage, FxBagStorageState } from '../selection/fxBagStorage'

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

const TEST_VERSION = 'attached-only-v1'

function sampleAttachment(overrides: Partial<VisualMediaAttachment> = {}): VisualMediaAttachment {
  return {
    id: 'clip-a',
    mediaType: 'video',
    url: '/uploads/user/clip-a.mp4',
    label: 'User Clip A',
    playback: {
      loop: true,
      timelineStartSec: 0,
      timelineDurationSec: 120,
      muted: true,
      objectFit: 'cover',
    },
    weight: 1,
    order: 0,
    enabled: true,
    durationMs: 60_000,
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
    isValidPresetId: id =>
      id === 'alpha'
      || id === 'beta'
      || id.startsWith('user-media:')
      || id === ATTACHED_ONLY_BLANK_PRESET_ID,
  })
}

describe('attachedOnly theatre playback', () => {
  beforeEach(() => {
    clearDynamicPresets()
    registerUserMediaEngine()
    registerAttachedOnlyBlankEngine()
    ensureAttachedOnlyBlankPreset()
  })

  it('attachedOnly active clip → user-media preset', () => {
    registerLocalTrackVisualMedia('song-attached', [sampleAttachment()], 'attachedOnly')
    const extras = buildSongVisualPickExtras(
      { trackId: 'song-attached' },
      { songDurationSec: 120, songPlayheadSec: 10 },
    )

    const memory = createMemoryStorage({
      version: TEST_VERSION,
      bag: ['alpha', 'beta'],
      updatedAt: Date.now(),
    })
    const selector = createSelector(memory.storage)

    expect(extras.songVisualPolicy).toBe('attachedOnly')
    expect(pickTimelineClipPresetId(extras)).toBe(userMediaPresetId('clip-a'))
    expect(selector.consumeNext({
      reducedMotion: false,
      activePresetId: null,
      ...extras,
    })?.id).toBe(userMediaPresetId('clip-a'))
    expect(memory.get()?.bag).toEqual(['alpha', 'beta'])
  })

  it('attachedOnly gap → blank preset, no builtin', () => {
    registerLocalTrackVisualMedia('song-gap', [
      sampleAttachment({
        playback: { loop: false, timelineStartSec: 0, timelineDurationSec: 60 },
        durationMs: 60_000,
      }),
    ], 'attachedOnly')
    const extras = buildSongVisualPickExtras(
      { trackId: 'song-gap' },
      { songDurationSec: 120, songPlayheadSec: 90 },
    )

    const memory = createMemoryStorage({
      version: TEST_VERSION,
      bag: ['alpha', 'beta'],
      updatedAt: Date.now(),
    })
    const selector = createSelector(memory.storage)

    expect(pickTimelineClipPresetId(extras)).toBeNull()
    expect(selector.consumeNext({
      reducedMotion: false,
      activePresetId: null,
      ...extras,
    })?.id).toBe(ATTACHED_ONLY_BLANK_PRESET_ID)
    expect(memory.get()?.bag).toEqual(['alpha', 'beta'])
    expect(resolvePreset(ATTACHED_ONLY_BLANK_PRESET_ID)).not.toBeNull()
  })

  it('hydration pending → no builtin regardless of policy', () => {
    const memory = createMemoryStorage({
      version: TEST_VERSION,
      bag: ['alpha', 'beta'],
      updatedAt: Date.now(),
    })
    const selector = createSelector(memory.storage)

    expect(selector.consumeNext({
      reducedMotion: false,
      activePresetId: null,
      songVisualPolicy: 'defaultOnly',
      songVisualHydrationPending: true,
      dynamicPresets: [],
      timelineClips: [],
    })).toBeNull()
    expect(memory.get()?.bag).toEqual(['alpha', 'beta'])
  })

  it('preferAttached gap → builtin fallback', () => {
    registerLocalTrackVisualMedia('song-prefer', [
      sampleAttachment({
        playback: { loop: false, timelineStartSec: 0, timelineDurationSec: 60 },
        durationMs: 60_000,
      }),
    ], 'preferAttached')
    const extras = buildSongVisualPickExtras(
      { trackId: 'song-prefer' },
      { songDurationSec: 120, songPlayheadSec: 90 },
    )

    const memory = createMemoryStorage({
      version: TEST_VERSION,
      bag: ['alpha', 'beta'],
      updatedAt: Date.now(),
    })
    const selector = createSelector(memory.storage)

    expect(extras.songVisualPolicy).toBe('preferAttached')
    expect(selector.consumeNext({
      reducedMotion: false,
      activePresetId: null,
      ...extras,
    })?.id).toBe('alpha')
  })

  it('no attachments → builtin fallback', () => {
    const memory = createMemoryStorage({
      version: TEST_VERSION,
      bag: ['alpha', 'beta'],
      updatedAt: Date.now(),
    })
    const selector = createSelector(memory.storage)
    const extras = buildSongVisualPickExtras(null, { songDurationSec: 120, songPlayheadSec: 0 })

    expect(extras.timelineClips).toEqual([])
    expect(extras.songVisualPolicy).toBe('defaultOnly')
    expect(selector.consumeNext({
      reducedMotion: false,
      activePresetId: null,
      ...extras,
    })?.id).toBe('alpha')
  })
})
