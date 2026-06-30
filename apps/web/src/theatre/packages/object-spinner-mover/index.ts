import type { AnimationPackage } from '../../registry/packages'
import { objectSpinnerMoverManifest } from './manifest'
import { objectSpinnerMoverFactory } from './ObjectSpinnerMoverScene'
import { objectSpinnerMoverPresets } from './presetEntries'

export { objectSpinnerMoverFactory }

export const objectSpinnerMoverPackage: AnimationPackage = {
  manifest: objectSpinnerMoverManifest,
  animations: [{
    id: 'objectSpinnerMover',
    label: 'Object Spinner Mover',
    factory: objectSpinnerMoverFactory,
    visualType: 'canvas',
    mood: 'dynamic',
    role: 'subject',
    weight: 2,
  }],
  presets: objectSpinnerMoverPresets,
}

export type { ObjectTheatrePreset } from './engine/types'
export type { ObjectTheatreSeed } from './presetEntries'
export { OBJECT_THEATRE_SEEDS, buildObjectTheatrePreset } from './presetEntries'
