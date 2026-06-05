import type { ScenePresetDef } from '../../registry/scenePresets'

export const circuitBotPresets: ScenePresetDef[] = [
  { id: 'circuitBotLab', label: 'Circuit Bot', category: 'lab', weight: 1, reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'circuitBot', role: 'subject', options: { opacity: 1, zIndex: 101 } }] },
]
