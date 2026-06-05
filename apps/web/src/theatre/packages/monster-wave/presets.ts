import type { ScenePresetDef } from '../../registry/scenePresets'

export const monsterWavePresets: ScenePresetDef[] = [
  { id: 'monsterWaveLab', label: 'Monster Wave', category: 'lab', weight: 1, reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'monsterWave', role: 'subject', options: { opacity: 1, zIndex: 101 } }] },
]
