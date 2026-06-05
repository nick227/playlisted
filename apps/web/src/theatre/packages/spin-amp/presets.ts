import type { ScenePresetDef } from '../../registry/scenePresets'

export const spinAmpPresets: ScenePresetDef[] = [
  {
    id: 'spinAmpSolo', label: 'Spin Amp', category: 'lab', weight: 1, reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'spinAmp', role: 'subject',
      options: { opacity: 0.85, zIndex: 101, blendMode: 'normal', intensity: 1.1, sensitivity: 1.2 } }],
  },
  {
    id: 'geometryTunnel', label: 'Geometry Tunnel', category: 'production', weight: 2, reducedMotionPreset: 'quietPulse',
    layers: [
      { animationId: 'spinAmp', role: 'background',
        options: { opacity: 0.70, zIndex: 100, blendMode: 'normal', intensity: 1.2, sensitivity: 1.3 } },
      { animationId: 'bioMachine', role: 'subject',
        options: { opacity: 0.60, zIndex: 101, blendMode: 'screen', intensity: 0.8, sensitivity: 0.9 } },
    ],
  },
]
