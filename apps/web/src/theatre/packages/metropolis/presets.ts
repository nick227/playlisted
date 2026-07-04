import type { ScenePresetDef } from '../../registry/scenePresets'
import {
  AUDIO_VIVID,
  PRESET_WEIGHT_STRONG,
  ROTATION_HOLD_FLAGSHIP,
  TAGS_LAB,
} from '../../registry/presetTuning'
import { METRO_SETTINGS } from './world/constants'

export const metropolisPresets: ScenePresetDef[] = [
  {
    id: 'metropolisNight',
    label: 'Metropolis Night',
    category: 'lab',
    weight: PRESET_WEIGHT_STRONG,
    tags: [...TAGS_LAB, 'epic', 'city', 'internal'],
    audioSensitivity: AUDIO_VIVID,
    rotation: {
      ...ROTATION_HOLD_FLAGSHIP,
      targetHoldMs: METRO_SETTINGS.targetHoldMs,
      maxHoldMs: METRO_SETTINGS.targetHoldMs + 60_000,
    },
    reducedMotionPreset: 'quietPulse',
    layers: [{
      animationId: 'metropolis',
      role: 'subject',
      options: {
        opacity: 1,
        zIndex: 101,
        blendMode: 'normal',
        intensity: 1,
        sensitivity: 1,
        preset: 'vivid',
      },
    }],
  },
]
