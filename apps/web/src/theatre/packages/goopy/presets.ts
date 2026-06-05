import type { ScenePresetDef } from '../../registry/scenePresets'

export const goopyPresets: ScenePresetDef[] = [
  { id: 'goopyLab', label: 'Goopy', category: 'lab', weight: 1, reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'goopy', role: 'subject', options: { opacity: 1, zIndex: 101 } }] },
]
