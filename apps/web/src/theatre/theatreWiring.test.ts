import { describe, expect, it } from 'vitest'

import registry from './registry'
import { getPreset, listPresets } from './scenePresets'
import './registry/seed'

describe('theatre wiring', () => {
  it('presets only reference registered animations and valid reduced-motion targets', () => {
    const presets = listPresets()
    expect(presets.length).toBeGreaterThan(0)

    for (const preset of presets) {
      for (const layer of preset.layers) {
        expect(
          registry.get(layer.animationId),
          `preset "${preset.id}" references unknown animation "${layer.animationId}"`,
        ).not.toBeNull()
      }
      if (preset.reducedMotionPreset) {
        expect(
          getPreset(preset.reducedMotionPreset),
          `preset "${preset.id}" reducedMotionPreset "${preset.reducedMotionPreset}" is missing`,
        ).not.toBeNull()
      }
    }

    expect(getPreset('signalOrganism')?.layers[0]?.animationId).toBe('signalOrganismScene')
    expect(getPreset('quietPulse')?.layers[0]?.animationId).toBe('speaker')
  })
})
