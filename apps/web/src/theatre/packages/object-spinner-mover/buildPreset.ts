import type { AudioSensitivity, ScenePresetDef } from '../../registry/scenePresets'
import {
  AUDIO_VIVID,
  PRESET_WEIGHT_OCCASIONAL,
  ROTATION_HOLD_LAB,
  TAGS_LAB,
} from '../../registry/presetTuning'
import type { ObjectTheatrePreset } from './engine/types'

export type ObjectTheatreSeed = {
  id: string
  label: string
  weight?: number
  category?: 'production' | 'lab'
  reducedMotionPreset?: string
  tags?: string[]
  audioSensitivity?: AudioSensitivity
  rotation?: ScenePresetDef['rotation']
  config: ObjectTheatrePreset
}

const LAYER_BASE = {
  opacity: 1,
  zIndex: 101,
  blendMode: 'normal' as const,
  intensity: 1,
  sensitivity: 1,
  preset: 'tame' as const,
}

export const OBJECT_SPINNER_MOVER_ID = 'objectSpinnerMover'

export function buildObjectTheatrePreset(seed: ObjectTheatreSeed): ScenePresetDef {
  return {
    id: seed.id,
    label: seed.label,
    category: seed.category ?? 'production',
    weight: seed.weight ?? PRESET_WEIGHT_OCCASIONAL,
    tags: seed.tags ?? [...TAGS_LAB, 'object-theatre'],
    audioSensitivity: seed.audioSensitivity ?? AUDIO_VIVID,
    rotation: seed.rotation ?? ROTATION_HOLD_LAB,
    reducedMotionPreset: seed.reducedMotionPreset ?? seed.id,
    layers: [{
      animationId: OBJECT_SPINNER_MOVER_ID,
      role: 'subject',
      options: {
        ...LAYER_BASE,
        objectTheatrePresetId: seed.id,
        objectTheatre: seed.config,
      },
    }],
  }
}

export function isObjectTheatrePreset(preset: ScenePresetDef): boolean {
  return preset.layers.some(layer => layer.animationId === OBJECT_SPINNER_MOVER_ID)
}
