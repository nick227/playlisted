import type { ScenePresetDef } from '../../registry/scenePresets'
import {
  AUDIO_TAME,
  PRESET_WEIGHT_STANDARD,
  ROTATION_HOLD_CALM,
  TAGS_CALM,
} from '../../registry/presetTuning'

export const weatherSpeakerPresets: ScenePresetDef[] = [
  {
    id: 'weatherSpeakerSolo',
    label: 'Weather Speaker',
    category: 'lab',
    weight: PRESET_WEIGHT_STANDARD,
    tags: [...TAGS_CALM, 'lab'],
    audioSensitivity: AUDIO_TAME,
    rotation: ROTATION_HOLD_CALM,
    reducedMotionPreset: 'quietPulse',
    layers: [{
      animationId: 'weatherSpeaker',
      role: 'background',
      options: { opacity: 1, zIndex: 100, blendMode: 'normal', intensity: 1, sensitivity: 1, preset: 'tame' },
    }],
  },
]
