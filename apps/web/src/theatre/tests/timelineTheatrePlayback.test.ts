import { describe, expect, it, vi, beforeEach } from 'vitest'

import registry from '../registry'
import { registerUserMediaEngine } from '../media/userMediaEngine'
import {
  attachmentToScenePreset,
  userMediaPresetId,
} from '../media/attachmentToScenePreset'
import { buildSongVisualPickExtras } from '../media/buildSongVisualPool'
import { clearDynamicPresets } from '../media/dynamicPresetStore'
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

const TEST_VERSION = 'timeline-test-v1'

function sampleAttachment(overrides: Partial<VisualMediaAttachment> = {}): VisualMediaAttachment {
  return {
    id: 'clip-a',
    mediaType: 'video',
    url: '/uploads/user/clip-a.mp4',
    label: 'User Clip A',
    playback: { loop: true, timelineDurationSec: 120, muted: true, objectFit: 'cover' },
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
    isValidPresetId: id => id === 'alpha' || id === 'beta' || id.startsWith('user-media:'),
  })
}

describe('timeline theatre playback', () => {
  beforeEach(() => {
    clearDynamicPresets()
    registerUserMediaEngine()
  })

  it('builds timeline clips from playbackJson duration and loop', () => {
    registerLocalTrackVisualMedia('song-timeline', [sampleAttachment()])

    const extras = buildSongVisualPickExtras(
      { trackId: 'song-timeline' },
      { songDurationSec: 120, songPlayheadSec: 30 },
    )

    expect(extras.timelineClips).toHaveLength(1)
    expect(extras.timelineClips[0]?.startSec).toBe(0)
    expect(extras.timelineClips[0]?.durationSec).toBe(120)
    expect(pickTimelineClipPresetId(extras)).toBe(userMediaPresetId('clip-a'))
  })

  it('returns null preset id in timeline gaps', () => {
    registerLocalTrackVisualMedia('song-gap', [
      sampleAttachment({
        playback: { loop: false, timelineDurationSec: 60 },
        durationMs: 60_000,
      }),
    ])

    const extras = buildSongVisualPickExtras(
      { trackId: 'song-gap' },
      { songDurationSec: 120, songPlayheadSec: 90 },
    )

    expect(extras.timelineClips[0]?.durationSec).toBe(60)
    expect(pickTimelineClipPresetId(extras)).toBeNull()
  })

  it('FxSelector picks active timeline clip at playhead instead of weighted bag', () => {
    registerLocalTrackVisualMedia('song-playhead', [sampleAttachment({ id: 'clip-a' })])
    const extras = buildSongVisualPickExtras(
      { trackId: 'song-playhead' },
      { songDurationSec: 120, songPlayheadSec: 10 },
    )

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

  it('FxSelector falls back to built-in presets in timeline gaps', () => {
    registerLocalTrackVisualMedia('song-gap-2', [
      sampleAttachment({
        playback: { loop: false, timelineDurationSec: 60 },
        durationMs: 60_000,
      }),
    ])
    const extras = buildSongVisualPickExtras(
      { trackId: 'song-gap-2' },
      { songDurationSec: 120, songPlayheadSec: 90 },
    )

    const memory = createMemoryStorage({
      version: TEST_VERSION,
      bag: ['alpha', 'beta'],
      updatedAt: Date.now(),
    })
    const selector = createSelector(memory.storage)

    expect(selector.consumeNext({
      reducedMotion: false,
      activePresetId: null,
      ...extras,
    })?.id).toBe('alpha')
  })

  it('keeps weighted rotation when song has no timeline attachments', () => {
    const memory = createMemoryStorage({
      version: TEST_VERSION,
      bag: ['alpha', 'beta'],
      updatedAt: Date.now(),
    })
    const selector = createSelector(memory.storage)
    const extras = buildSongVisualPickExtras(null, { songDurationSec: 120, songPlayheadSec: 0 })

    expect(extras.timelineClips).toEqual([])
    expect(selector.consumeNext({
      reducedMotion: false,
      activePresetId: null,
      ...extras,
    })?.id).toBe('alpha')
  })

  it('maps timeline playback fields from API attachments', () => {
    const preset = attachmentToScenePreset(sampleAttachment({
      playback: { loop: false, timelineDurationSec: 45, timelineStartSec: 0 },
    }))
    expect(preset.layers[0]?.options?.loop).toBe(false)
    expect(resolvePreset(preset.id)).not.toBeNull()
  })
})
