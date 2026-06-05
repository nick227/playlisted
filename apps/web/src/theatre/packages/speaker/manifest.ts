import type { AnimationPackageManifest } from '../../registry/packages'

export const speakerManifest: AnimationPackageManifest = {
  id: 'speaker',
  label: 'Speaker Pulse',
  version: '1.0.0',
  kind: 'visual-scene',
  category: 'production',
  description: 'Reduced-motion-safe pulsing speaker scene.',
  capabilities: ['audio-features', 'external-raf', 'reduced-motion'],
  reducedMotionSafe: true,
}
