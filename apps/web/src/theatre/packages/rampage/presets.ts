import type { ScenePresetDef } from '../../registry/scenePresets'

export const rampagePresets: ScenePresetDef[] = [
  {
    id: 'rampageClassic', label: 'Rampage', category: 'lab', weight: 1, reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'rampage', role: 'subject',
      options: { opacity: 1, zIndex: 101, blendMode: 'normal', intensity: 1, sensitivity: 1 } }],
  },
]
