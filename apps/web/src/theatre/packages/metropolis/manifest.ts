import type { AnimationPackageManifest } from '../../registry/packages'

export const metropolisManifest: AnimationPackageManifest = {
  id: 'metropolis',
  label: 'Metropolis Night',
  version: '0.1.0',
  kind: 'visual-scene',
  category: 'lab',
  description: 'Epic 3/4 aerial night city — gritty districts, traffic, timed events.',
  capabilities: ['audio-features', 'visual-triggers', 'external-raf', 'particles'],
  weight: 2,
}
