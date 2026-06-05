import type { ScenePresetDef } from '../../registry/scenePresets'

export const eyeCloudPresets: ScenePresetDef[] = [
  { id: 'eyeCloudLab', label: 'Eye Cloud', category: 'lab', weight: 1, reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'eyeCloud', role: 'subject', options: { opacity: 1, zIndex: 101 } }] },
]
