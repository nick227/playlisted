import type { AnimationPackage } from '../../registry/packages'
import liminalDoomFactory from './LiminalDoomScene'
import { liminalDoomManifest } from './manifest'
import { liminalDoomPresets } from './presets'

export { liminalDoomFactory }

export const liminalDoomPackage: AnimationPackage = {
  manifest: liminalDoomManifest,
  animations: [
    { id: 'liminalDoom', label: 'Liminal Doom', factory: liminalDoomFactory, visualType: 'canvas', mood: 'dynamic', role: 'subject', weight: 1 },
  ],
  presets: liminalDoomPresets,
}
