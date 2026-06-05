import type { ScenePresetDef } from '../../registry/scenePresets'

export const rainPresets: ScenePresetDef[] = [
  {
    id: 'rainstorm', label: 'Rainstorm', category: 'production', weight: 3, reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'rain', role: 'background',
      options: { opacity: 1.0, zIndex: 100, blendMode: 'normal', intensity: 1.0, sensitivity: 1.0 } }],
  },
]
