import type { ScenePresetDef } from '../../registry/scenePresets'
import {
  AUDIO_CHAOS,
  PRESET_WEIGHT_OCCASIONAL,
  ROTATION_HOLD_LAB,
  TAGS_CHARACTER,
} from '../../registry/presetTuning'

export const rampagePresets: ScenePresetDef[] = [
  {
    id: 'rampageClassic',
    label: 'Rampage',
    category: 'lab',
    weight: PRESET_WEIGHT_OCCASIONAL,
    tags: [...TAGS_CHARACTER],
    audioSensitivity: AUDIO_CHAOS,
    rotation: ROTATION_HOLD_LAB,
    reducedMotionPreset: 'quietPulse',
    layers: [{
      animationId: 'rampage',
      role: 'subject',
      options: { opacity: 1, zIndex: 101, blendMode: 'normal', intensity: 1, sensitivity: 1, preset: 'chaos' },
    }],
  },
]
