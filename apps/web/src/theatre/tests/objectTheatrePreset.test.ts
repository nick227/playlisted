import { describe, expect, it } from 'vitest'

import registry from '../registry'
import { getPreset } from '../registry/scenePresets'
import { withTheatreInitContext, resolveTheatreInitContext } from '../controller/theatreFrameContext'
import { objectSpinnerMoverFactory } from '../packages/object-spinner-mover/ObjectSpinnerMoverScene'
import { getObjectTheatreSeedConfig } from '../packages/object-spinner-mover/seeds'
import '../registry/seed'

function buildInitContext(presetId: string, stripObjectTheatre = false) {
  const preset = getPreset(presetId)
  expect(preset).not.toBeNull()
  const layer = preset!.layers[0]!
  const layerOptions = { ...layer.options }
  if (stripObjectTheatre) delete layerOptions.objectTheatre
  return {
    options: {
      ...layerOptions,
      objectTheatrePresetId: presetId,
    },
  }
}

describe('object theatre presets', () => {
  it('registers distinct sticker presets with objectTheatre config', () => {
    for (const id of ['poop-wave-silly', 'ufo-tunnel-cosmic', 'knife-spiral-horror', 'burger-bounce-carnival']) {
      const config = getObjectTheatreSeedConfig(id)
      expect(config, id).not.toBeNull()
      const preset = getPreset(id)
      expect(preset?.layers[0]?.options?.objectTheatre).toEqual(config)
      expect(preset?.layers[0]?.options?.objectTheatrePresetId).toBe(id)
    }
  })

  it('binds preset config through factory init context', () => {
    const cases = [
      ['poop-wave-silly', 'silly', 'waveRows'],
      ['ufo-tunnel-cosmic', 'cosmic', 'tunnel'],
      ['knife-spiral-horror', 'horrorSnack', 'spiral'],
    ] as const

    for (const [presetId, shapePack, motionPreset] of cases) {
      const initContext = buildInitContext(presetId)
      const entry = registry.get('objectSpinnerMover')
      expect(entry).not.toBeNull()
      const instance = withTheatreInitContext(entry!.factory(initContext), initContext)
      const resolved = resolveTheatreInitContext(instance, { options: {} })
      expect(resolved.options?.objectTheatre?.shapePack).toBe(shapePack)
      expect(resolved.options?.objectTheatre?.motionPreset).toBe(motionPreset)
    }
  })

  it('falls back to preset id when objectTheatre is missing from options', () => {
    const initContext = buildInitContext('knife-spiral-horror', true)
    const entry = registry.get('objectSpinnerMover')
    const instance = entry!.factory(initContext)
    const debug = instance as {
      getObjectTheatreDebugState?: () => { shapePack: string; motionPreset: string }
    }
    expect(debug.getObjectTheatreDebugState?.().shapePack).toBe('horrorSnack')
    expect(debug.getObjectTheatreDebugState?.().motionPreset).toBe('spiral')
  })
})
