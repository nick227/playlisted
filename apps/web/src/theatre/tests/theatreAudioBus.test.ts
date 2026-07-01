import { describe, expect, it } from 'vitest'

import type { Features } from '../audio/AudioFeatureExtractor'
import {
  AUDIO_SENSITIVITY_PRESETS,
  createFallbackAudioSnapshot,
  DEFAULT_AUDIO_SENSITIVITY,
  getTriggersForPreset,
  TheatreAudioBus,
} from '../audio/TheatreAudioBus'

function sampleFeatures(overrides: Partial<Features> = {}): Features {
  return {
    rms: 0.2,
    env: 0.18,
    bands: { bass: 0.4, mids: 0.3, highs: 0.2 },
    bandEnv: { bass: 0.35, mids: 0.28, highs: 0.18 },
    flux: { overall: 0.15, bass: 0.2, mids: 0.12, highs: 0.08 },
    centroid: 0.42,
    ...overrides,
  }
}

describe('TheatreAudioBus', () => {
  it('derives edges only on rising boolean transitions', () => {
    const bus = new TheatreAudioBus()

    const first = bus.tick(sampleFeatures({ flux: { overall: 0, bass: 0, mids: 0, highs: 0 } }), 16)
    expect(first.edges.beat).toBe(false)
    expect(first.edges.chaosHit).toBe(false)

    const second = bus.tick(sampleFeatures({
      flux: { overall: 0.25, bass: 0.3, mids: 0.2, highs: 0.15 },
      env: 0.3,
    }), 16)
    expect(second.edges.beat || second.edges.chaosHit || second.edges.bassHit).toBe(true)

    const third = bus.tick(sampleFeatures({
      flux: { overall: 0.25, bass: 0.3, mids: 0.2, highs: 0.15 },
      env: 0.3,
    }), 16)
    expect(third.edges.beat).toBe(false)
    expect(third.edges.chaosHit).toBe(false)
    expect(third.edges.bassHit).toBe(false)
  })

  it('getTriggersForPreset returns vivid by default', () => {
    const bus = new TheatreAudioBus()
    const snapshot = bus.tick(sampleFeatures(), 16)

    expect(getTriggersForPreset(snapshot)).toEqual(snapshot.triggersByPreset.vivid)
    expect(getTriggersForPreset(snapshot)).toEqual(snapshot.triggers)
    expect(getTriggersForPreset(snapshot, undefined)).toEqual(snapshot.triggersByPreset.vivid)
  })

  it('missing features returns stable fallback snapshot', () => {
    const first = createFallbackAudioSnapshot()
    const second = createFallbackAudioSnapshot()

    expect(first).toEqual(second)
    expect(first.triggers).toEqual(second.triggers)
    expect(first.triggers.energy).toBe(0)
    expect(first.edges).toEqual({
      beat: false,
      bassHit: false,
      midsHit: false,
      highsHit: false,
      chaosHit: false,
      drop: false,
    })
  })

  it('triggersByPreset contains tame, vivid, chaos, and nightmare', () => {
    const bus = new TheatreAudioBus()
    const snapshot = bus.tick(sampleFeatures(), 16)

    for (const preset of AUDIO_SENSITIVITY_PRESETS) {
      expect(snapshot.triggersByPreset[preset]).toBeDefined()
      expect(typeof snapshot.triggersByPreset[preset].energy).toBe('number')
    }
    expect(DEFAULT_AUDIO_SENSITIVITY).toBe('vivid')
  })
})
