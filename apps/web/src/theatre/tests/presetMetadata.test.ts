import { describe, expect, it } from 'vitest'

import { DEFAULT_ROTATION_POLICY_CONFIG } from '../rotation/RotationPolicy'
import { getPreset, listPresets } from '../registry/scenePresets'
import {
  FAMILY_WEIGHT_FLAGSHIP,
  PRESET_WEIGHT_FLAGSHIP,
  PRESET_WEIGHT_OCCASIONAL,
  ROTATION_HOLD_FLAGSHIP,
} from '../registry/presetTuning'
import { collectWeightedFamilyCatalog, computeCatalogVersion } from '../selection/catalogVersion'
import { buildFamilyWeightedShuffleBag, countFamilyRepresentation } from '../selection/buildWeightedShuffleBag'
import { getRotationPackages } from '../registry/packageRotation'
import '../registry/seed'

describe('preset metadata audit', () => {
  it('assigns audioSensitivity and tags to every registered preset', () => {
    const presets = listPresets()
    expect(presets.length).toBeGreaterThan(20)

    for (const preset of presets) {
      expect(preset.audioSensitivity, preset.id).toBeDefined()
      expect(preset.tags?.length, preset.id).toBeGreaterThan(0)
    }
  })

  it('pins album art per track without elevated bag weight', () => {
    const albumArt = getPreset('albumArtStill')
    expect(albumArt?.rotation?.mode).toBe('perTrack')
    expect(albumArt?.weight).toBe(PRESET_WEIGHT_OCCASIONAL)
    expect(albumArt?.tags).toContain('occasional')
  })

  it('boosts flagship presets with longer hold windows and higher weights', () => {
    const flagship = getPreset('signalOrganism')
    expect(flagship?.weight).toBe(PRESET_WEIGHT_FLAGSHIP)
    expect(flagship?.audioSensitivity).toBe('vivid')
    expect(flagship?.rotation?.minHoldMs).toBe(ROTATION_HOLD_FLAGSHIP.minHoldMs)
    expect(flagship?.tags).toContain('flagship')
  })

  it('uses only albumArtStill for perTrack rotation override', () => {
    const perTrackPresets = listPresets().filter(preset => preset.rotation?.mode === 'perTrack')
    expect(perTrackPresets.map(preset => preset.id)).toEqual(['albumArtStill'])
  })

  it('defaults global rotation timing to the tuned 45/90/150 windows', () => {
    expect(DEFAULT_ROTATION_POLICY_CONFIG.minHoldMs).toBe(45_000)
    expect(DEFAULT_ROTATION_POLICY_CONFIG.targetHoldMs).toBe(90_000)
    expect(DEFAULT_ROTATION_POLICY_CONFIG.maxHoldMs).toBe(150_000)
  })

  it('gives flagship families more bag representation than video families', () => {
    const families = collectWeightedFamilyCatalog()
    const flagshipFamily = families.find(family => family.familyId === 'signal-organism')
    const videoFamily = families.find(family => family.familyId === 'video1')

    expect(flagshipFamily?.familyWeight).toBe(FAMILY_WEIGHT_FLAGSHIP)
    expect(videoFamily?.familyWeight).toBe(1)

    const bag = buildFamilyWeightedShuffleBag(families)
    const familyOf = (presetId: string) =>
      getRotationPackages().find(pkg => pkg.presetIds.includes(presetId))?.manifest.id ?? null
    const counts = countFamilyRepresentation(bag, familyOf)

    expect(counts.get('signal-organism') ?? 0).toBeGreaterThan(counts.get('video1') ?? 0)
  })

  it('invalidates local bag storage when catalog metadata changes', () => {
    const version = computeCatalogVersion()
    expect(version.length).toBeGreaterThan(0)
    expect(version).toMatch(/^[a-z0-9]+$/i)
  })
})
