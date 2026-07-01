import type { ScenePresetDef } from '../../registry/scenePresets'
import {
  AUDIO_CHAOS,
  PRESET_WEIGHT_OCCASIONAL,
  ROTATION_HOLD_LAB,
  TAGS_CHARACTER,
} from '../../registry/presetTuning'

export const cheechChongPresets: ScenePresetDef[] = [
  {
    id: 'cheechChongFarm',
    label: 'Cheech & Chong',
    category: 'lab',
    weight: PRESET_WEIGHT_OCCASIONAL,
    tags: [...TAGS_CHARACTER],
    audioSensitivity: AUDIO_CHAOS,
    rotation: ROTATION_HOLD_LAB,
    reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'cheech-chong', options: { preset: 'chaos' } }],
  },
]
