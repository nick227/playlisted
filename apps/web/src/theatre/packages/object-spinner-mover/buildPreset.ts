import type { ScenePresetDef } from '../../registry/scenePresets'
import type { ObjectTheatrePreset } from './engine/types'

export type ObjectTheatreSeed = {
  id: string
  label: string
  weight?: number
  category?: 'production' | 'lab'
  reducedMotionPreset?: string
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
    weight: seed.weight ?? 1,
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
