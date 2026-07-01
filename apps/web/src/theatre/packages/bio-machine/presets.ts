import type { ScenePresetDef } from '../../registry/scenePresets'
import {
  AUDIO_VIVID,
  PRESET_WEIGHT_OCCASIONAL,
  ROTATION_HOLD_LAB,
  TAGS_LAB,
} from '../../registry/presetTuning'

export const bioMachinePresets: ScenePresetDef[] = [
  {
    id: 'bioMachineSolo',
    label: 'Bio Machine',
    category: 'lab',
    weight: PRESET_WEIGHT_OCCASIONAL,
    tags: [...TAGS_LAB],
    audioSensitivity: AUDIO_VIVID,
    rotation: ROTATION_HOLD_LAB,
    reducedMotionPreset: 'quietPulse',
    layers: [{
      animationId: 'bioMachine',
      role: 'subject',
      options: { opacity: 0.8, zIndex: 101, blendMode: 'screen', intensity: 0.9, sensitivity: 0.9, preset: 'vivid' },
    }],
  },
]
