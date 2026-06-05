import type { AnimationPackageManifest } from '../../registry/packages'

export const weatherSpeakerManifest: AnimationPackageManifest = {
  id: 'weather-speaker',
  label: 'Weather Speaker',
  version: '1.0.0',
  kind: 'audio-reactive-background',
  category: 'lab',
  capabilities: ['audio-features', 'external-raf'],
}
