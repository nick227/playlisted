import type { AnimationPackageManifest } from '../../registry/packages'

export const bioMachineManifest: AnimationPackageManifest = {
  id: 'bio-machine',
  label: 'Bio Machine',
  version: '1.0.0',
  kind: 'visual-scene',
  category: 'lab',
  capabilities: ['audio-features', 'external-raf'],
}
