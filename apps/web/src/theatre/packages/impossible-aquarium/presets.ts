import type { ScenePresetDef } from '../../registry/scenePresets'

export const impossibleAquariumPresets: ScenePresetDef[] = [
  {
    id: 'impossibleAquarium', label: 'Impossible Aquarium', category: 'production', weight: 3, reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'impossibleAquarium', role: 'subject',
      options: { opacity: 0.98, zIndex: 101, blendMode: 'normal', intensity: 1.0, sensitivity: 1.0 } }],
  },
]
