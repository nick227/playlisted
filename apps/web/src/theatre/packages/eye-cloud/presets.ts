import type { ScenePresetDef } from '../../registry/scenePresets'
import {
  AUDIO_VIVID,
  PRESET_WEIGHT_OCCASIONAL,
  ROTATION_HOLD_LAB,
  TAGS_LAB,
} from '../../registry/presetTuning'

export const eyeCloudPresets: ScenePresetDef[] = [
  {
    id: 'eyeCloudLab',
    label: 'Eye Cloud',
    category: 'lab',
    weight: PRESET_WEIGHT_OCCASIONAL,
    tags: [...TAGS_LAB],
    audioSensitivity: AUDIO_VIVID,
    rotation: ROTATION_HOLD_LAB,
    reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'eyeCloud', role: 'subject', options: { opacity: 1, zIndex: 101, preset: 'vivid' } }],
  },
]
