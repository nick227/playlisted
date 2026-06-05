import type { AnimationPackage } from '../../registry/packages'
import rainFactory from './RainScene'
import { rainManifest } from './manifest'
import { rainPresets } from './presets'

export { rainFactory }

export const rainPackage: AnimationPackage = {
  manifest: rainManifest,
  animations: [
    { id: 'rain', label: 'Rain', factory: rainFactory, visualType: 'canvas', mood: 'calm', role: 'background', weight: 3 },
  ],
  presets: rainPresets,
}
