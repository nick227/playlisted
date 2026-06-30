import type { ScenePresetDef } from '../../registry/scenePresets'

export const cheechChongPresets: ScenePresetDef[] = [
  {
    id: 'cheechChongFarm', label: 'Cheech & Chong', category: 'lab', weight: 1, reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'cheech-chong' }]
  }
]
