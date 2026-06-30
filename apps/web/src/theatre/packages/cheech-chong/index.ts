import type { AnimationPackage } from '../../registry/packages'
import cheechChongFactory from './CheechChongScene'
import { cheechChongManifest } from './manifest'
import { cheechChongPresets } from './presets'

export { cheechChongFactory }

export const cheechChongPackage: AnimationPackage = {
  manifest: cheechChongManifest,
  animations: [
    { id: 'cheech-chong', label: 'Cheech & Chong', factory: cheechChongFactory, visualType: 'canvas', mood: 'dynamic', role: 'subject', weight: 1 },
  ],
  presets: cheechChongPresets,
}
