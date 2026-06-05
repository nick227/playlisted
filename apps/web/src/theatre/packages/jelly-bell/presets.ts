import type { ScenePresetDef } from '../../registry/scenePresets'

export const jellyBellPresets: ScenePresetDef[] = [
  { id: 'jellyBellLab', label: 'Jelly Bell', category: 'lab', weight: 1, reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'jellyBell', role: 'subject', options: { opacity: 1, zIndex: 101 } }] },
]
