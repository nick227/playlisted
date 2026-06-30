import { afterEach, describe, expect, it, vi } from 'vitest'

import '../registry/seed'
import {
  getPackageIdForPreset,
  getRotationPackages,
  pickPackagePreset,
  weightedPick,
} from '../registry/packageRotation'

describe('package rotation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('registers videos as one rotation family', () => {
    const videos = getRotationPackages().find(pkg => pkg.manifest.id === 'videos')
    expect(videos?.presetIds).toHaveLength(60)
  })

  it('maps presets back to their package', () => {
    expect(getPackageIdForPreset('cheechChongFarm')).toBe('cheech-chong')
    expect(getPackageIdForPreset('video17')).toBe('videos')
    expect(getPackageIdForPreset('geometryTunnel')).toBe('spin-amp')
  })

  it('weightedPick honors relative weights', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const picked = weightedPick(
      [{ id: 'light' }, { id: 'heavy' }],
      item => (item.id === 'heavy' ? 9 : 1),
    )
    expect(picked?.id).toBe('heavy')
  })

  it('never returns an excluded preset', () => {
    for (let i = 0; i < 100; i++) {
      const picked = pickPackagePreset({ excludePresetIds: ['video1'] })
      expect(picked?.id).not.toBe('video1')
    }
  })
})
