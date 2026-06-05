import type { ScenePresetDef } from '../../registry/scenePresets'

export const stopMotionFlowerStormPresets: ScenePresetDef[] = [
  {
    id: 'stormFlower', label: 'Storm Flower', category: 'lab', weight: 2, reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'stopMotionFlowerStorm', role: 'subject',
      options: { opacity: 0.98, zIndex: 101 } }],
  },
]
