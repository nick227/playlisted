import type { ScenePresetDef } from '../../registry/scenePresets'

export const cuteMonstroPresets: ScenePresetDef[] = [
  { id: 'cuteMonstroLab', label: 'Cute Monstro', category: 'lab', weight: 1, reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'cuteMonstro', role: 'subject', options: { opacity: 1, zIndex: 101 } }] },
]
