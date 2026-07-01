import type { ScenePresetDef } from '../../registry/scenePresets'
import {
  AUDIO_VIVID,
  PRESET_WEIGHT_OCCASIONAL,
  ROTATION_HOLD_LAB,
  TAGS_CHARACTER,
} from '../../registry/presetTuning'

export const cruisinPresets: ScenePresetDef[] = [
  {
    id: 'cruisinClassic',
    label: 'Cruisin',
    category: 'lab',
    weight: PRESET_WEIGHT_OCCASIONAL,
    tags: [...TAGS_CHARACTER],
    audioSensitivity: AUDIO_VIVID,
    rotation: ROTATION_HOLD_LAB,
    reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'cruisin', options: { preset: 'vivid' } }],
  },
]
