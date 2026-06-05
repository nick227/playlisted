import type { AnimationPackageManifest } from '../../registry/packages'

export const signalOrganismManifest: AnimationPackageManifest = {
  id: 'signal-organism',
  label: 'Signal Organism',
  version: '1.0.0',
  kind: 'visual-scene',
  category: 'production',
  capabilities: ['audio-features', 'visual-triggers', 'external-raf', 'particles'],
}
