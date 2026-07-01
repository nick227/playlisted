import type { ScenePresetDef } from '../../registry/scenePresets'
import {
  AUDIO_CHAOS,
  PRESET_WEIGHT_OCCASIONAL,
  ROTATION_HOLD_LAB,
  TAGS_CHARACTER,
} from '../../registry/presetTuning'

export const liminalDoomPresets: ScenePresetDef[] = [
  {
    id: 'liminal-doom-demo',
    label: 'Liminal Doom',
    category: 'lab',
    weight: PRESET_WEIGHT_OCCASIONAL,
    tags: [...TAGS_CHARACTER, 'story'],
    audioSensitivity: AUDIO_CHAOS,
    rotation: ROTATION_HOLD_LAB,
    reducedMotionPreset: 'quietPulse',
    layers: [{
      animationId: 'liminalDoom',
      role: 'subject',
      options: { opacity: 1.0, zIndex: 101, blendMode: 'normal', intensity: 1.0, sensitivity: 1.0, preset: 'chaos' },
    }],
  },
]
