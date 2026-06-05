import type { AnimationPackageManifest } from '../../registry/packages'

export const goopyManifest: AnimationPackageManifest = {
  id: 'goopy',
  label: 'Goopy',
  version: '1.0.0',
  kind: 'visual-scene',
  category: 'lab',
  capabilities: ['audio-features', 'external-raf'],
}
