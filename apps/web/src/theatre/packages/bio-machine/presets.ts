import type { ScenePresetDef } from '../../registry/scenePresets'

export const bioMachinePresets: ScenePresetDef[] = [
  {
    id: 'bioMachineSolo', label: 'Bio Machine', category: 'lab', weight: 1, reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'bioMachine', role: 'subject',
      options: { opacity: 0.8, zIndex: 101, blendMode: 'screen', intensity: 0.9, sensitivity: 0.9 } }],
  },
]
