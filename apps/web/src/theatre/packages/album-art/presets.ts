import type { ScenePresetDef } from '../../registry/scenePresets'

export const albumArtPresets: ScenePresetDef[] = [
  {
    id: 'albumArtStill',
    label: 'Album Art Still',
    category: 'production',
    weight: 1,
    tags: ['image', 'album-art', 'low-motion', 'song-safe'],
    audioSensitivity: 'tame',
    rotation: { mode: 'perTrack' },
    layers: [
      {
        animationId: 'albumArtImage',
        role: 'background',
        options: { preset: 'tame', zIndex: 100, opacity: 1 },
      },
    ],
  },
]
