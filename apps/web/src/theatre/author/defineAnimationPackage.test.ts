import { describe, expect, it } from 'vitest'

import { defineAnimationPackage } from './defineAnimationPackage'
import type { AnimationContext, IAnimation } from '../core/IAnimation'

function testFactory(): IAnimation {
  return {
    init: async () => {},
    start: async () => {},
    pause: () => {},
    resume: () => {},
    stop: async () => {},
    destroy: () => {},
    renderFrame: (_context: AnimationContext) => {},
  }
}

describe('defineAnimationPackage', () => {
  it('produces a single-layer canvas package with typed layer options', () => {
    const pkg = defineAnimationPackage({
      id: 'test-scene',
      label: 'Test Scene',
      animationId: 'testScene',
      factory: testFactory,
      presetId: 'testScenePreset',
      reducedMotionPreset: 'quietPulse',
      layerOptions: { preset: 'tame', opacity: 0.9 },
    })

    expect(pkg.manifest.id).toBe('test-scene')
    expect(pkg.animations).toHaveLength(1)
    expect(pkg.animations[0].visualType).toBe('canvas')
    expect(pkg.presets).toHaveLength(1)
    expect(pkg.presets[0].layers).toHaveLength(1)
    expect(pkg.presets[0].layers[0].options?.preset).toBe('tame')
    expect(pkg.presets[0].layers[0].options?.opacity).toBe(0.9)
    expect(pkg.presets[0].reducedMotionPreset).toBe('quietPulse')
    expect('objectTheatre' in (pkg.presets[0].layers[0].options ?? {})).toBe(false)
  })
})
