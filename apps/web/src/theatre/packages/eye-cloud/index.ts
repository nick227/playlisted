import { defineAnimationPackage } from '../../author/defineAnimationPackage'
import eyeCloudFactory from './EyeCloudScene'
import { eyeCloudManifest } from './manifest'
import { eyeCloudPresets } from './presets'

export { eyeCloudFactory }

export const eyeCloudPackage = {
  ...defineAnimationPackage({ id: 'eye-cloud', label: 'Eye Cloud', animationId: 'eyeCloud', factory: eyeCloudFactory, presetId: 'eyeCloudLab', reducedMotionPreset: 'quietPulse' }),
  manifest: eyeCloudManifest,
  presets: eyeCloudPresets,
}
