import type { ScenePresetDef } from '../../registry/scenePresets'
import {
  AUDIO_VIVID,
  PRESET_WEIGHT_OCCASIONAL,
  ROTATION_HOLD_LAB,
  TAGS_LAB,
} from '../../registry/presetTuning'

export const goopyPresets: ScenePresetDef[] = [
  {
    id: 'goopyLab',
    label: 'Goopy',
    category: 'lab',
    weight: PRESET_WEIGHT_OCCASIONAL,
    tags: [...TAGS_LAB],
    audioSensitivity: AUDIO_VIVID,
    rotation: ROTATION_HOLD_LAB,
    reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'goopy', role: 'subject', options: { opacity: 1, zIndex: 101, preset: 'vivid' } }],
  },
]
