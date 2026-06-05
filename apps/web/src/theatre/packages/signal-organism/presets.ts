import type { ScenePresetDef } from '../../registry/scenePresets'

export const signalOrganismPresets: ScenePresetDef[] = [
  {
    id: 'signalOrganism', label: 'Signal Organism', category: 'production', weight: 3, reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'signalOrganismScene', role: 'subject',
      options: { opacity: 0.98, zIndex: 101, blendMode: 'normal', intensity: 1.0, sensitivity: 1.0 } }],
  },
]
