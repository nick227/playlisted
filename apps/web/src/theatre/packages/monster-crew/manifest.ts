import type { AnimationPackageManifest } from '../../registry/packages'

export const monsterCrewManifest: AnimationPackageManifest = {
  id: 'monster-crew',
  label: 'Monster Cycle',
  version: '1.0.0',
  kind: 'character-scene',
  category: 'production',
  capabilities: ['audio-features', 'external-raf'],
}
