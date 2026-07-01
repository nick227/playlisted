import type { AnimationPackageManifest } from '../../registry/packages'

export const spinAmpManifest: AnimationPackageManifest = {
  id: 'spin-amp',
  label: 'Spin Amp',
  version: '1.0.0',
  kind: 'visual-scene',
  category: 'lab',
  capabilities: ['audio-features', 'external-raf'],
  weight: 3,
}
