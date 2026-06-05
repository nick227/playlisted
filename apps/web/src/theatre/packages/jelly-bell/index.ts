import { defineFirstPartyPackage } from '../firstPartyPackage'
import jellyBellFactory from './JellyBellScene'
import { jellyBellManifest } from './manifest'
import { jellyBellPresets } from './presets'

export { jellyBellFactory }

export const jellyBellPackage = {
  ...defineFirstPartyPackage({ id: 'jelly-bell', label: 'Jelly Bell', animationId: 'jellyBell', factory: jellyBellFactory, presetId: 'jellyBellLab', reducedMotionPreset: 'quietPulse' }),
  manifest: jellyBellManifest,
  presets: jellyBellPresets,
}
