import type { AnimationPackage } from '../../registry/packages'
import impossibleAquariumFactory from './ImpossibleAquariumScene'
import { impossibleAquariumManifest } from './manifest'
import { impossibleAquariumPresets } from './presets'

export { impossibleAquariumFactory }

export const impossibleAquariumPackage: AnimationPackage = {
  manifest: impossibleAquariumManifest,
  animations: [
    { id: 'impossibleAquarium', label: 'Impossible Aquarium', factory: impossibleAquariumFactory, visualType: 'canvas', mood: 'dynamic', role: 'subject', weight: 3 },
  ],
  presets: impossibleAquariumPresets,
}
