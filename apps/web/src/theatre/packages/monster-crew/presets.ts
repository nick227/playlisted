import type { ScenePresetDef } from '../../registry/scenePresets'

export const monsterCrewPresets: ScenePresetDef[] = [
  {
    id: 'monsterCrewScene', label: 'Monster Cycle', category: 'production', weight: 3, reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'monsterCrew', role: 'subject',
      options: { opacity: 1.0, zIndex: 101, blendMode: 'normal', intensity: 1.0, sensitivity: 1.0, switchMs: 15000, fadeMs: 650 } }],
  },
]
