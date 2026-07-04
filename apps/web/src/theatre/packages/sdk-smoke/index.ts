import { defineAnimationPackage } from '@/theatre/author'

import { sdkSmokeFactory } from './SdkSmokeScene'

export { sdkSmokeFactory }

const base = defineAnimationPackage({
  id: 'sdk-smoke',
  label: 'SDK Smoke',
  animationId: 'sdkSmoke',
  factory: sdkSmokeFactory,
  presetId: 'sdkSmokeLab',
  reducedMotionPreset: 'quietPulse',
  category: 'dev',
  layerOptions: { preset: 'tame', opacity: 1 },
})

export const sdkSmokePackage = {
  ...base,
  presets: base.presets.map(preset => ({
    ...preset,
    tags: ['internal', 'sdk-smoke'],
    audioSensitivity: 'tame' as const,
  })),
}
