import type { AnimationPackageManifest } from '../../registry/packages'

export const rainManifest: AnimationPackageManifest = {
  id: 'rain',
  label: 'Rain',
  version: '1.0.0',
  kind: 'audio-reactive-background',
  category: 'production',
  capabilities: ['audio-features', 'visual-triggers', 'external-raf'],
}
