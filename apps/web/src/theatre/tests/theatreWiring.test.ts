import { describe, expect, it } from 'vitest'

import type { AnimationContext, IAnimation } from '../core/IAnimation'
import registry from '../registry'
import { getPreset, listPresets, pickPreset } from '../registry/scenePresets'
import {
  ensureAnimationPackage,
  listRegisteredAnimationPackageIds,
  registerAnimationPackage,
} from '../registry/registerAnimationPackage'
import '../registry/seed'

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

  it('registers animation packages into the existing registry and preset lookup', () => {
    expect(listRegisteredAnimationPackageIds()).toContain('puppet-dancer')
    expect(registry.get('puppetDancer')).not.toBeNull()
    expect(getPreset('puppetDancerBasic')?.layers[0]?.animationId).toBe('puppetDancer')
    expect(listPresets().filter(preset => preset.layers.some(layer => layer.animationId === 'puppetDancer'))).toHaveLength(1)
  })

  it('keeps existing known presets available after package migration', () => {
    expect(getPreset('geometryTunnel')?.layers.map(layer => layer.animationId)).toEqual(['spinAmp', 'bioMachine'])
    expect(getPreset('monsterCrewScene')?.layers[0]?.animationId).toBe('monsterCrew')
    expect(getPreset('rainstorm')?.layers[0]?.animationId).toBe('rain')
  })

  it('resolves reduced-motion presets through the unchanged preset picker', () => {
    const picked = pickPreset({
      preferCategory: 'production',
      reducedMotion: true,
      excludeIds: listPresets().filter(preset => preset.id !== 'puppetDancerBasic').map(preset => preset.id),
    })
    expect(picked?.id).toBe('quietPulse')
  })

  it('rejects duplicate package, animation, and preset IDs', () => {
    expect(() => ensureAnimationPackage({
      manifest: { id: 'osm-burger-bounce-carnival', label: 'Already Seeded', version: '1.0.0', kind: 'effect-system', category: 'lab' },
      animations: [],
      presets: [],
    })).not.toThrow()

    expect(() => registerAnimationPackage({
      manifest: { id: 'puppet-dancer', label: 'Duplicate Puppet', version: '1.0.0', kind: 'visual-scene', category: 'lab' },
      animations: [{ id: 'duplicatePuppet', label: 'Duplicate Puppet', factory: testFactory, visualType: 'canvas', mood: 'calm' }],
      presets: [{ id: 'duplicatePuppetPreset', label: 'Duplicate Puppet', category: 'lab', layers: [{ animationId: 'duplicatePuppet' }] }],
    })).toThrow(/duplicate package id/)

    expect(() => registerAnimationPackage({
      manifest: { id: 'duplicate-animation-test', label: 'Duplicate Animation', version: '1.0.0', kind: 'visual-scene', category: 'lab' },
      animations: [{ id: 'speaker', label: 'Speaker Again', factory: testFactory, visualType: 'canvas', mood: 'calm' }],
      presets: [{ id: 'duplicateAnimationPreset', label: 'Duplicate Animation', category: 'lab', layers: [{ animationId: 'speaker' }] }],
    })).toThrow(/duplicate animation id/)

    expect(() => registerAnimationPackage({
      manifest: { id: 'duplicate-preset-test', label: 'Duplicate Preset', version: '1.0.0', kind: 'visual-scene', category: 'lab' },
      animations: [{ id: 'duplicatePresetAnimation', label: 'Duplicate Preset Animation', factory: testFactory, visualType: 'canvas', mood: 'calm' }],
      presets: [{ id: 'quietPulse', label: 'Quiet Again', category: 'lab', layers: [{ animationId: 'duplicatePresetAnimation' }] }],
    })).toThrow(/duplicate preset id/)
  })
})
