import { defineAnimationPackage } from '../../author/defineAnimationPackage'
import cuteMonstroFactory from './CuteMonstroScene'
import { cuteMonstroManifest } from './manifest'
import { cuteMonstroPresets } from './presets'

export { cuteMonstroFactory }

export const cuteMonstroPackage = {
  ...defineAnimationPackage({ id: 'cute-monstro', label: 'Cute Monstro', animationId: 'cuteMonstro', factory: cuteMonstroFactory, presetId: 'cuteMonstroLab', reducedMotionPreset: 'quietPulse' }),
  manifest: cuteMonstroManifest,
  presets: cuteMonstroPresets,
}
