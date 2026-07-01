import type { ScenePresetDef } from '../../registry/scenePresets'
import {
  AUDIO_VIVID,
  PRESET_WEIGHT_STRONG,
  ROTATION_HOLD_FLAGSHIP,
  TAGS_STRONG,
} from '../../registry/presetTuning'

export const stopMotionFlowerStormPresets: ScenePresetDef[] = [
  {
    id: 'stormFlower',
    label: 'Storm Flower',
    category: 'lab',
    weight: PRESET_WEIGHT_STRONG,
    tags: [...TAGS_STRONG, 'story'],
    audioSensitivity: AUDIO_VIVID,
    rotation: ROTATION_HOLD_FLAGSHIP,
    reducedMotionPreset: 'quietPulse',
    layers: [{
      animationId: 'stopMotionFlowerStorm',
      role: 'subject',
      options: { opacity: 0.98, zIndex: 101, preset: 'vivid' },
    }],
  },
]
