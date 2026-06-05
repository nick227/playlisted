import type { ScenePresetDef } from '../../registry/scenePresets'

export const eqBarsPresets: ScenePresetDef[] = [
  {
    id: 'eqBars', label: 'EQ Bars', category: 'production', weight: 3, reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'eqBars', role: 'subject',
      options: { opacity: 1.0, zIndex: 101, blendMode: 'normal', intensity: 1.0, sensitivity: 1.0 } }],
  },
]
