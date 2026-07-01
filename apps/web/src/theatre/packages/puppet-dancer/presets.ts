import type { ScenePresetDef } from '../../registry/scenePresets'
import {
  AUDIO_TAME,
  PRESET_WEIGHT_STRONG,
  ROTATION_HOLD_FLAGSHIP,
  TAGS_STRONG,
} from '../../registry/presetTuning'

export const puppetDancerPresets: ScenePresetDef[] = [
  {
    id: 'puppetDancerBasic',
    label: 'Puppet Dancer',
    category: 'production',
    weight: PRESET_WEIGHT_STRONG,
    tags: [...TAGS_STRONG, 'character'],
    audioSensitivity: AUDIO_TAME,
    rotation: ROTATION_HOLD_FLAGSHIP,
    reducedMotionPreset: 'quietPulse',
    layers: [{
      animationId: 'puppetDancer',
      role: 'subject',
      options: { opacity: 1, zIndex: 101, blendMode: 'normal', intensity: 0.8, sensitivity: 0.8, sequence: 'dynamicRandom', preset: 'tame' },
    }],
  },
]
