import type { ScenePresetDef } from '../../registry/scenePresets'
import {
  AUDIO_TAME,
  PRESET_WEIGHT_OCCASIONAL,
  ROTATION_HOLD_CALM,
} from '../../registry/presetTuning'

export const albumArtPresets: ScenePresetDef[] = [
  {
    id: 'albumArtStill',
    label: 'Album Art Still',
    category: 'production',
    weight: PRESET_WEIGHT_OCCASIONAL,
    tags: ['image', 'album-art', 'low-motion', 'song-safe', 'occasional'],
    audioSensitivity: AUDIO_TAME,
    rotation: { mode: 'perTrack', ...ROTATION_HOLD_CALM },
    layers: [
      {
        animationId: 'albumArtImage',
        role: 'background',
        options: { preset: 'tame', zIndex: 100, opacity: 1 },
      },
    ],
  },
]
