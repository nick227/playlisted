import type { ScenePresetDef } from '../../registry/scenePresets'

export const cruisinPresets: ScenePresetDef[] = [
  {
    id: 'cruisinClassic', label: 'Cruisin', category: 'lab', weight: 1, reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'cruisin' }]
  }
]
