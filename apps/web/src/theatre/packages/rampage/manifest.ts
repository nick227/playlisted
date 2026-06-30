import type { AnimationPackageManifest } from '../../registry/packages'

export const rampageManifest: AnimationPackageManifest = {
  id: 'rampage',
  label: 'Rampage',
  version: '1.0.0',
  kind: 'visual-scene',
  category: 'lab',
  capabilities: ['audio-features', 'external-raf'],
}
