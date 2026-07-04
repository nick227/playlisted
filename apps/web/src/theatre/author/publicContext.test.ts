import { describe, expect, it } from 'vitest'

import type { AnimationContext } from '../core/IAnimation'
import { toPublicAnimationContext, toPublicSharedContext, bandsFromPublicContext } from './publicContext'

describe('author publicContext', () => {
  it('strips analyser and audioElement from public context', () => {
    const internal: AnimationContext = {
      audioElement: {} as HTMLMediaElement,
      analyser: {} as AnalyserNode,
      mediaSrc: 'internal-only',
      artworkUrl: '/art.jpg',
      metadata: { title: 'Track', artist: 'Artist' },
      options: {
        opacity: 0.8,
        preset: 'vivid',
        objectTheatrePresetId: 'secret',
      },
      shared: {
        features: {
          rms: 0.5,
          env: 0.4,
          bands: { bass: 0.3, mids: 0.2, highs: 0.1 },
          bandEnv: { bass: 0.25, mids: 0.15, highs: 0.05 },
          flux: { overall: 0.1, bass: 0.05, mids: 0.03, highs: 0.02 },
          centroid: 0.6,
        },
        reducedMotion: false,
        lowPower: false,
        dprClamp: 2,
        particleScale: 1,
        time: { elapsed: 1000, delta: 16, frame: 60 },
        getTriggers: () => ({
          bassHit: false,
          midsHit: false,
          highsHit: false,
          beat: true,
          chaosHit: false,
          energy: 0.5,
          brightness: 0.5,
        }),
      },
    }

    const pub = toPublicAnimationContext(internal)
    expect(pub.artworkUrl).toBe('/art.jpg')
    expect(pub.metadata?.title).toBe('Track')
    expect(pub.options.opacity).toBe(0.8)
    expect(pub.options.preset).toBe('vivid')
    expect('objectTheatrePresetId' in pub.options).toBe(false)
    expect('analyser' in pub).toBe(false)
    expect('audioElement' in pub).toBe(false)
    expect('mediaSrc' in pub).toBe(false)
    expect(pub.shared.getTriggers('vivid').beat).toBe(true)
  })

  it('freezes features so authors cannot mutate shared state', () => {
    const features = {
      rms: 0.5,
      env: 0.4,
      bands: { bass: 0.3, mids: 0.2, highs: 0.1 },
      bandEnv: { bass: 0.25, mids: 0.15, highs: 0.05 },
      flux: { overall: 0.1, bass: 0.05, mids: 0.03, highs: 0.02 },
      centroid: 0.6,
    }
    const shared = toPublicSharedContext({
      features,
      time: { elapsed: 0, delta: 16, frame: 0 },
    })

    expect(Object.isFrozen(shared)).toBe(true)
    expect(Object.isFrozen(shared.features)).toBe(true)
    expect(Object.isFrozen(shared.features!.bands)).toBe(true)

    expect(() => {
      (shared.features as { rms: number }).rms = 9
    }).toThrow()
  })

  it('reads bands from public features without analyser', () => {
    const pub = toPublicAnimationContext({
      options: {},
      shared: {
        features: {
          rms: 0,
          env: 0,
          bands: { bass: 0.9, mids: 0.5, highs: 0.2 },
          bandEnv: { bass: 0, mids: 0, highs: 0 },
          flux: { overall: 0, bass: 0, mids: 0, highs: 0 },
          centroid: 0,
        },
        time: { elapsed: 0, delta: 16, frame: 0 },
      },
    })
    expect(bandsFromPublicContext(pub)).toEqual({ bass: 0.9, mids: 0.5, highs: 0.2 })
  })
})
