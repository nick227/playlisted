import type { AnimationPackageManifest } from '../../registry/packages'

export const puppetDancerManifest: AnimationPackageManifest = {
  id: 'puppet-dancer',
  label: 'Puppet Dancer',
  version: '1.0.0',
  kind: 'character-rig',
  category: 'production',
  description: 'Pose-driven puppet dancer with beat-synced forward kinematics.',
  capabilities: ['audio-features', 'visual-triggers', 'external-raf', 'reduced-motion', 'character-rig'],
  reducedMotionSafe: true,
}

