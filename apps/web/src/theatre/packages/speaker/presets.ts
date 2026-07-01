import type { ScenePresetDef } from '../../registry/scenePresets'
import {
  AUDIO_TAME,
  PRESET_WEIGHT_STANDARD,
  ROTATION_HOLD_CALM,
  TAGS_CALM,
} from '../../registry/presetTuning'

export const speakerPresets: ScenePresetDef[] = [
  {
    id: 'quietPulse',
    label: 'Quiet Pulse',
    category: 'production',
    weight: PRESET_WEIGHT_STANDARD,
    tags: [...TAGS_CALM, 'fallback'],
    audioSensitivity: AUDIO_TAME,
    rotation: ROTATION_HOLD_CALM,
    layers: [
      {
        animationId: 'speaker',
        role: 'subject',
        options: { opacity: 0.75, zIndex: 101, blendMode: 'normal', intensity: 0.25, sensitivity: 0.4, preset: 'tame' },
      },
    ],
  },
]
