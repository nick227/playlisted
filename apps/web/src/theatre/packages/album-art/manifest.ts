import type { AnimationPackageManifest } from '../../registry/packages'

export const albumArtManifest: AnimationPackageManifest = {
  id: 'album-art',
  label: 'Album Art',
  version: '1.0.0',
  kind: 'visual-scene',
  category: 'production',
  description: 'Static album artwork with gentle Ken Burns motion.',
  capabilities: ['audio-features', 'visual-triggers', 'external-raf', 'reduced-motion'],
  reducedMotionSafe: true,
  weight: 1,
}
