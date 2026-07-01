import type { AnimationPackageManifest } from '../../registry/packages'

export const stopMotionFlowerStormManifest: AnimationPackageManifest = {
  id: 'stop-motion-flower-storm',
  label: 'Stop-Motion Flower Storm',
  version: '1.0.0',
  kind: 'stop-motion-story',
  category: 'lab',
  capabilities: ['audio-features', 'visual-triggers', 'external-raf', 'story'],
  weight: 3,
}
