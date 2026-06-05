import type { AnimationPackageManifest } from '../../registry/packages'

export const liminalDoomManifest: AnimationPackageManifest = {
  id: 'liminal-doom',
  label: 'Liminal Doom',
  version: '1.0.0',
  kind: 'character-scene',
  category: 'lab',
  capabilities: ['audio-features', 'visual-triggers', 'external-raf', 'story'],
}
