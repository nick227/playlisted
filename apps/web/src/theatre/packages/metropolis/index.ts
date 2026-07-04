import type { AnimationPackage } from '../../registry/packages'
import metropolisFactory from './MetropolisScene'
import { metropolisManifest } from './manifest'
import { metropolisPresets } from './presets'

export { metropolisFactory }

export const metropolisPackage: AnimationPackage = {
  manifest: metropolisManifest,
  animations: [
    {
      id: 'metropolis',
      label: 'Metropolis Night',
      factory: metropolisFactory,
      visualType: 'canvas',
      mood: 'dynamic',
      role: 'subject',
      weight: 2,
    },
  ],
  presets: metropolisPresets,
}
