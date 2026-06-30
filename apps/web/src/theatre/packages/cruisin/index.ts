import type { AnimationPackage } from '../../registry/packages'
import cruisinFactory from './CruisinScene'
import { cruisinManifest } from './manifest'
import { cruisinPresets } from './presets'

export { cruisinFactory }

export const cruisinPackage: AnimationPackage = {
  manifest: cruisinManifest,
  animations: [
    { id: 'cruisin', label: 'Cruisin FX', factory: cruisinFactory, visualType: 'canvas', mood: 'dynamic', role: 'subject', weight: 1 },
  ],
  presets: cruisinPresets,
}
