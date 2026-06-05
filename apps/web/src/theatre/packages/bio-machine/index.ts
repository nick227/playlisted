import type { AnimationPackage } from '../../registry/packages'
import bioMachineFactory from './BioMachineScene'
import { bioMachineManifest } from './manifest'
import { bioMachinePresets } from './presets'

export { bioMachineFactory }

export const bioMachinePackage: AnimationPackage = {
  manifest: bioMachineManifest,
  animations: [
    { id: 'bioMachine', label: 'Bio Machine', factory: bioMachineFactory, visualType: 'canvas', mood: 'dynamic', role: 'subject', weight: 1 },
  ],
  presets: bioMachinePresets,
}
