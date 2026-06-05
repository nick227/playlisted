import { defineFirstPartyPackage } from '../firstPartyPackage'
import cuteMonstroFactory from './CuteMonstroScene'
import { cuteMonstroManifest } from './manifest'
import { cuteMonstroPresets } from './presets'

export { cuteMonstroFactory }

export const cuteMonstroPackage = {
  ...defineFirstPartyPackage({ id: 'cute-monstro', label: 'Cute Monstro', animationId: 'cuteMonstro', factory: cuteMonstroFactory, presetId: 'cuteMonstroLab', reducedMotionPreset: 'quietPulse' }),
  manifest: cuteMonstroManifest,
  presets: cuteMonstroPresets,
}
