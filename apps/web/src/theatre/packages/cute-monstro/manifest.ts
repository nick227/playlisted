import type { AnimationPackageManifest } from '../../registry/packages'

export const cuteMonstroManifest: AnimationPackageManifest = {
  id: 'cute-monstro',
  label: 'Cute Monstro',
  version: '1.0.0',
  kind: 'character-scene',
  category: 'lab',
  capabilities: ['audio-features', 'external-raf'],
}
