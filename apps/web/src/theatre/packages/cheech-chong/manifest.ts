import type { AnimationPackageManifest } from '../../registry/packages'

export const cheechChongManifest: AnimationPackageManifest = {
  id: 'cheech-chong',
  label: "Cheech & Chong",
  version: '1.0.0',
  kind: 'visual-scene',
  category: 'lab',
  capabilities: {
    audioFeatureReactivity: ['energy', 'bassHit', 'beat']
  }
}
