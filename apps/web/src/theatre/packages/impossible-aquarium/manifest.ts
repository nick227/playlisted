import type { AnimationPackageManifest } from '../../registry/packages'

export const impossibleAquariumManifest: AnimationPackageManifest = {
  id: 'impossible-aquarium',
  label: 'Impossible Aquarium',
  version: '1.0.0',
  kind: 'visual-scene',
  category: 'production',
  capabilities: ['audio-features', 'visual-triggers', 'external-raf'],
}
