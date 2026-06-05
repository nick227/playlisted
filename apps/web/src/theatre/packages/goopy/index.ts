import { defineFirstPartyPackage } from '../firstPartyPackage'
import goopyFactory from './GoopyScene'
import { goopyManifest } from './manifest'
import { goopyPresets } from './presets'

export { goopyFactory }

export const goopyPackage = {
  ...defineFirstPartyPackage({ id: 'goopy', label: 'Goopy', animationId: 'goopy', factory: goopyFactory, presetId: 'goopyLab', reducedMotionPreset: 'quietPulse' }),
  manifest: goopyManifest,
  presets: goopyPresets,
}
