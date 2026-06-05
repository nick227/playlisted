import type { AnimationPackageManifest } from '../../registry/packages'

export const monsterWaveManifest: AnimationPackageManifest = {
  id: 'monster-wave',
  label: 'Monster Wave',
  version: '1.0.0',
  kind: 'visual-scene',
  category: 'lab',
  capabilities: ['audio-features', 'external-raf'],
}
