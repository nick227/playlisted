import type { ScenePresetDef } from '../../registry/scenePresets'
import {
  AUDIO_TAME,
  PRESET_WEIGHT_FLAGSHIP,
  ROTATION_HOLD_CALM,
  TAGS_CALM,
} from '../../registry/presetTuning'

export const rainPresets: ScenePresetDef[] = [
  {
    id: 'rainstorm',
    label: 'Rainstorm',
    category: 'production',
    weight: PRESET_WEIGHT_FLAGSHIP,
    tags: [...TAGS_CALM, 'flagship', 'production'],
    audioSensitivity: AUDIO_TAME,
    rotation: ROTATION_HOLD_CALM,
    reducedMotionPreset: 'quietPulse',
    layers: [{
      animationId: 'rain',
      role: 'background',
      options: { opacity: 1.0, zIndex: 100, blendMode: 'normal', intensity: 1.0, sensitivity: 1.0, preset: 'tame' },
    }],
  },
]
