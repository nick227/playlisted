import type { ScenePresetDef } from '../../registry/scenePresets'

export const puppetDancerPresets: ScenePresetDef[] = [
  {
    id: 'puppetDancerBasic',
    label: 'Puppet Dancer',
    category: 'production',
    weight: 2,
    reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'puppetDancer', role: 'subject',
      options: { opacity: 1, zIndex: 101, blendMode: 'normal', intensity: 0.8, sensitivity: 0.8, sequence: 'goofyTwoStep', preset: 'tame' } }],
  },
]
