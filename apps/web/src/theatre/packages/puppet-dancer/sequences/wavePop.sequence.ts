import { idlePose, leftStepPose, rightStepPose } from '../poses/basicPoses'
import { poseVariant } from '../poses/poseAuthoring'
import type { DanceMap } from './sequenceTypes'

const waveLeftPose = poseVariant(leftStepPose, 'waveLeft', 'Wave Left', {
  rotations: { leftShoulder: 170, leftElbow: 98, leftWrist: 34, rightShoulder: -10, rightElbow: -92, rightWrist: -150, head: -10 },
})

const waveRightPose = poseVariant(rightStepPose, 'waveRight', 'Wave Right', {
  rotations: { leftShoulder: 146, leftElbow: 82, leftWrist: 140, rightShoulder: -10, rightElbow: -20, rightWrist: -26, head: 10 },
})

export const wavePopSequence: DanceMap = {
  schemaVersion: 1,
  id: 'wave-pop',
  label: 'Wave Pop',
  description: 'Alternating arm wave with pop accents.',
  loop: true,
  defaultBpm: 110,
  intensity: 0.9,
  loose: 0.86,
  reducedMotion: { sequence: 'goofyTwoStep', intensity: 0.25, disableAccents: true },
  poses: { idle: idlePose, waveLeft: waveLeftPose, waveRight: waveRightPose },
  triggerAccents: {
    beat: ['headNod'],
    bassHit: ['hipBounce'],
    midsHit: ['shoulderPop'],
    highsHit: ['wristFlick'],
    chaosHit: ['chaosStretch'],
  },
  steps: [
    { pose: 'waveLeft', durationMs: 360, holdMs: 40, ease: 'elasticOut', advanceOn: 'highsHit', accents: ['wristFlick'] },
    { pose: 'idle', durationMs: 120, holdMs: 20, ease: 'easeInOut' },
    { pose: 'waveRight', durationMs: 360, holdMs: 40, ease: 'elasticOut', advanceOn: 'highsHit', accents: ['wristFlick'] },
    { pose: 'idle', durationMs: 120, holdMs: 20, ease: 'easeInOut' },
  ],
}

