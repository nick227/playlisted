import type { ScenePresetDef } from '../../registry/scenePresets'
import {
  AUDIO_VIVID,
  PRESET_WEIGHT_OCCASIONAL,
  PRESET_WEIGHT_STRONG,
  ROTATION_HOLD_FLAGSHIP,
  ROTATION_HOLD_LAB,
  TAGS_LAB,
  TAGS_STRONG,
} from '../../registry/presetTuning'

export const spinAmpPresets: ScenePresetDef[] = [
  {
    id: 'spinAmpSolo',
    label: 'Spin Amp',
    category: 'lab',
    weight: PRESET_WEIGHT_OCCASIONAL,
    tags: [...TAGS_LAB],
    audioSensitivity: 'vivid',
    rotation: ROTATION_HOLD_LAB,
    reducedMotionPreset: 'quietPulse',
    layers: [{
      animationId: 'spinAmp',
      role: 'subject',
      options: { opacity: 0.85, zIndex: 101, blendMode: 'normal', intensity: 1.1, sensitivity: 1.2, preset: 'vivid' },
    }],
  },
  {
    id: 'geometryTunnel',
    label: 'Geometry Tunnel',
    category: 'production',
    weight: PRESET_WEIGHT_STRONG,
    tags: [...TAGS_STRONG, 'composite'],
    audioSensitivity: AUDIO_VIVID,
    rotation: ROTATION_HOLD_FLAGSHIP,
    reducedMotionPreset: 'quietPulse',
    layers: [
      {
        animationId: 'spinAmp',
        role: 'background',
        options: { opacity: 0.70, zIndex: 100, blendMode: 'normal', intensity: 1.2, sensitivity: 1.3, preset: 'vivid' },
      },
      {
        animationId: 'bioMachine',
        role: 'subject',
        options: { opacity: 0.60, zIndex: 101, blendMode: 'screen', intensity: 0.8, sensitivity: 0.9, preset: 'vivid' },
      },
    ],
  },
]
