import type { ScenePresetDef } from '../../registry/scenePresets'

export const liminalDoomPresets: ScenePresetDef[] = [
  {
    id: 'liminal-doom-demo', label: 'Liminal Doom', category: 'lab', weight: 1, reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'liminalDoom', role: 'subject',
      options: { opacity: 1.0, zIndex: 101, blendMode: 'normal', intensity: 1.0, sensitivity: 1.0 } }],
  },
]
