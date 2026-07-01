import type { ScenePresetDef } from '../../registry/scenePresets'
import {
  AUDIO_VIVID,
  PRESET_WEIGHT_FLAGSHIP,
  ROTATION_HOLD_FLAGSHIP,
  TAGS_FLAGSHIP,
} from '../../registry/presetTuning'

export const eqBarsPresets: ScenePresetDef[] = [
  {
    id: 'eqBars',
    label: 'EQ Bars',
    category: 'production',
    weight: PRESET_WEIGHT_FLAGSHIP,
    tags: [...TAGS_FLAGSHIP, 'visualizer'],
    audioSensitivity: AUDIO_VIVID,
    rotation: ROTATION_HOLD_FLAGSHIP,
    reducedMotionPreset: 'quietPulse',
    layers: [{
      animationId: 'eqBars',
      role: 'subject',
      options: { opacity: 1.0, zIndex: 101, blendMode: 'normal', intensity: 1.0, sensitivity: 1.0, preset: 'vivid' },
    }],
  },
]
