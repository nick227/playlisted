import type { AnimationPackageManifest } from '../../registry/packages'

export const circuitBotManifest: AnimationPackageManifest = {
  id: 'circuit-bot',
  label: 'Circuit Bot',
  version: '1.0.0',
  kind: 'character-scene',
  category: 'lab',
  capabilities: ['audio-features', 'visual-triggers', 'external-raf'],
}
