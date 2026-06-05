import type { AnimationPackageManifest } from '../../registry/packages'

export const eqBarsManifest: AnimationPackageManifest = {
  id: 'eq-bars',
  label: 'EQ Bars',
  version: '1.0.0',
  kind: 'audio-reactive-background',
  category: 'production',
  capabilities: ['audio-features', 'external-raf', 'reduced-motion'],
}
