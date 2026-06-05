import type { AnimationPackageManifest } from '../../registry/packages'

export const eyeCloudManifest: AnimationPackageManifest = {
  id: 'eye-cloud',
  label: 'Eye Cloud',
  version: '1.0.0',
  kind: 'visual-scene',
  category: 'lab',
  capabilities: ['audio-features', 'external-raf'],
}
