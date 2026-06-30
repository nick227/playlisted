import type { AnimationPackage } from '../../registry/packages'
import rampageFactory from './RampageScene'
import { rampageManifest } from './manifest'
import { rampagePresets } from './presets'

export { rampageFactory }

export const rampagePackage: AnimationPackage = {
  manifest: rampageManifest,
  animations: [
    { id: 'rampage', label: 'Rampage FX', factory: rampageFactory, visualType: 'canvas', mood: 'dynamic', role: 'subject', weight: 1 },
  ],
  presets: rampagePresets,
}
