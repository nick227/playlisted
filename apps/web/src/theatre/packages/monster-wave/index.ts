import { defineAnimationPackage } from '../../author/defineAnimationPackage'
import monsterWaveFactory from './MonsterWaveScene'
import { monsterWaveManifest } from './manifest'
import { monsterWavePresets } from './presets'

export { monsterWaveFactory }

export const monsterWavePackage = {
  ...defineAnimationPackage({ id: 'monster-wave', label: 'Monster Wave', animationId: 'monsterWave', factory: monsterWaveFactory, presetId: 'monsterWaveLab', reducedMotionPreset: 'quietPulse' }),
  manifest: monsterWaveManifest,
  presets: monsterWavePresets,
}
