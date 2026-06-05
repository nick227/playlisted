import type { ScenePresetDef } from '../../registry/scenePresets'

export const speakerPresets: ScenePresetDef[] = [
  {
    id: 'quietPulse', label: 'Quiet Pulse', category: 'production', weight: 1,
    layers: [
      { animationId: 'speaker', role: 'subject',
        options: { opacity: 0.75, zIndex: 101, blendMode: 'normal', intensity: 0.25, sensitivity: 0.4 } },
    ],
  },
]
