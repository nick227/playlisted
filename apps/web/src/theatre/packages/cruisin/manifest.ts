import type { AnimationPackageManifest } from '../../registry/packages'

export const cruisinManifest: AnimationPackageManifest = {
  id: 'cruisin',
  label: "Cruisin'",
  version: '1.0.0',
  kind: 'visual-scene',
  category: 'lab',
  capabilities: ['audio-features', 'visual-triggers', 'external-raf'],
}
