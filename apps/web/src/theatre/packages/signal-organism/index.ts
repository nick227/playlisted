import type { AnimationPackage } from '../../registry/packages'
import signalOrganismFactory from './SignalOrganismScene'
import { signalOrganismManifest } from './manifest'
import { signalOrganismPresets } from './presets'

export { signalOrganismFactory }

export const signalOrganismPackage: AnimationPackage = {
  manifest: signalOrganismManifest,
  animations: [
    { id: 'signalOrganismScene', label: 'Signal Organism', factory: signalOrganismFactory, visualType: 'canvas', mood: 'dynamic', role: 'subject', weight: 2 },
  ],
  presets: signalOrganismPresets,
}
