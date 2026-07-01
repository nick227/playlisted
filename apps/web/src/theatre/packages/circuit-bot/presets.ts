import type { ScenePresetDef } from '../../registry/scenePresets'
import {
  AUDIO_VIVID,
  PRESET_WEIGHT_OCCASIONAL,
  ROTATION_HOLD_LAB,
  TAGS_LAB,
} from '../../registry/presetTuning'

export const circuitBotPresets: ScenePresetDef[] = [
  {
    id: 'circuitBotLab',
    label: 'Circuit Bot',
    category: 'lab',
    weight: PRESET_WEIGHT_OCCASIONAL,
    tags: [...TAGS_LAB, 'character'],
    audioSensitivity: AUDIO_VIVID,
    rotation: ROTATION_HOLD_LAB,
    reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'circuitBot', role: 'subject', options: { opacity: 1, zIndex: 101, preset: 'vivid' } }],
  },
]
