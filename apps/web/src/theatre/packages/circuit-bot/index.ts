import { defineAnimationPackage } from '../../author/defineAnimationPackage'
import circuitBotFactory from './CircuitBotScene'
import { circuitBotManifest } from './manifest'
import { circuitBotPresets } from './presets'

export { circuitBotFactory }

export const circuitBotPackage = {
  ...defineAnimationPackage({ id: 'circuit-bot', label: 'Circuit Bot', animationId: 'circuitBot', factory: circuitBotFactory, presetId: 'circuitBotLab', reducedMotionPreset: 'quietPulse' }),
  manifest: circuitBotManifest,
  presets: circuitBotPresets,
}
