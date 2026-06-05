import type { AnimationPackage } from '../../registry/packages'
import eqBarsFactory from './EqBarsScene'
import { eqBarsManifest } from './manifest'
import { eqBarsPresets } from './presets'

export { eqBarsFactory }

export const eqBarsPackage: AnimationPackage = {
  manifest: eqBarsManifest,
  animations: [
    { id: 'eqBars', label: 'EQ Bars', factory: eqBarsFactory, visualType: 'canvas', mood: 'dynamic', role: 'subject', weight: 3 },
  ],
  presets: eqBarsPresets,
}
