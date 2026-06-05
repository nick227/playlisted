import type { AnimationPackageManifest } from '../../registry/packages'

export const jellyBellManifest: AnimationPackageManifest = {
  id: 'jelly-bell',
  label: 'Jelly Bell',
  version: '1.0.0',
  kind: 'visual-scene',
  category: 'lab',
  capabilities: ['audio-features', 'external-raf'],
}
