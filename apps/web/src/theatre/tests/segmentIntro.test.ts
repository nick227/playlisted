import { describe, expect, it } from 'vitest'

import { ALBUM_ART_INTRO_PRESET_ID } from '../packages/album-art/presets'
import {
  isSegmentIntroPreset,
  isSegmentIntroPresetExcludedFromBag,
  resolveSegmentIntro,
} from '../segmentIntro/resolveSegmentIntro'
import type { PickContext } from '../selection/types'
import { getPreset } from '../registry/scenePresets'
import '../registry/seed'

const baseCtx = (overrides: Partial<PickContext> = {}): PickContext => ({
  reducedMotion: false,
  ...overrides,
})

describe('resolveSegmentIntro', () => {
  it('returns albumArtIntro when artwork is available', () => {
    expect(
      resolveSegmentIntro({
        artworkUrl: 'https://cdn.example/cover.jpg',
        pickCtx: baseCtx(),
      }),
    ).toBe(ALBUM_ART_INTRO_PRESET_ID)
  })

  it('returns null when artwork is missing', () => {
    expect(
      resolveSegmentIntro({
        artworkUrl: null,
        pickCtx: baseCtx(),
      }),
    ).toBeNull()
  })

  it('returns null when intro policy is none', () => {
    expect(
      resolveSegmentIntro({
        artworkUrl: 'https://cdn.example/cover.jpg',
        pickCtx: baseCtx(),
        introPolicy: 'none',
      }),
    ).toBeNull()
  })

  it('skips intro for attachedOnly when a timeline clip is active at playhead', () => {
    expect(
      resolveSegmentIntro({
        artworkUrl: 'https://cdn.example/cover.jpg',
        pickCtx: baseCtx({
          songVisualPolicy: 'attachedOnly',
          songPlayheadSec: 2,
          timelineClips: [
            {
              attachment: {
                id: 'clip-1',
                url: 'https://cdn.example/clip.jpg',
                mediaType: 'image',
              },
              startSec: 0,
              endSec: 8,
              durationSec: 8,
              loop: false,
              naturalDurationSec: 8,
            },
          ],
        }),
      }),
    ).toBeNull()
  })

  it('allows intro for attachedOnly when playhead is in a timeline gap', () => {
    expect(
      resolveSegmentIntro({
        artworkUrl: 'https://cdn.example/cover.jpg',
        pickCtx: baseCtx({
          songVisualPolicy: 'attachedOnly',
          songPlayheadSec: 0,
          timelineClips: [
            {
              attachment: {
                id: 'clip-1',
                url: 'https://cdn.example/clip.jpg',
                mediaType: 'image',
              },
              startSec: 10,
              endSec: 18,
              durationSec: 8,
              loop: false,
              naturalDurationSec: 8,
            },
          ],
        }),
      }),
    ).toBe(ALBUM_ART_INTRO_PRESET_ID)
  })
})

describe('segment intro preset metadata', () => {
  it('registers albumArtIntro with timedMusicAware rotation', () => {
    const preset = getPreset(ALBUM_ART_INTRO_PRESET_ID)
    expect(preset?.rotation?.mode).toBe('timedMusicAware')
    expect(preset?.rotation?.minHoldMs).toBe(8_000)
    expect(preset?.tags).toContain('segment-intro')
  })

  it('identifies segment intro presets', () => {
    expect(isSegmentIntroPreset(ALBUM_ART_INTRO_PRESET_ID)).toBe(true)
    expect(isSegmentIntroPreset('albumArtStill')).toBe(false)
  })

  it('excludes segment intro presets from shuffle bag catalog', () => {
    expect(isSegmentIntroPresetExcludedFromBag(ALBUM_ART_INTRO_PRESET_ID)).toBe(true)
    expect(isSegmentIntroPresetExcludedFromBag('albumArtStill')).toBe(false)
  })
})
