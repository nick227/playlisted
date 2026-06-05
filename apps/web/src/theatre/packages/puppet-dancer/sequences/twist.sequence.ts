import { idlePose, leftStepPose, rightStepPose } from '../poses/basicPoses'
import { poseVariant } from '../poses/poseAuthoring'
import type { DanceMap } from './sequenceTypes'

const twistLeftPose = poseVariant(leftStepPose, 'twistLeft', 'Twist Left', {
  rotations: { hips: -24, chest: 24, leftHip: -16, rightHip: -10, leftAnkle: -18, rightAnkle: -18, head: 16 },
})

const twistRightPose = poseVariant(rightStepPose, 'twistRight', 'Twist Right', {
  rotations: { hips: 24, chest: -24, leftHip: 10, rightHip: 16, leftAnkle: 18, rightAnkle: 18, head: -16 },
})

export const twistSequence: DanceMap = {
  schemaVersion: 1,
  id: 'twist',
  label: 'Twist',
  description: 'Counter-rotating hips and chest with planted feet.',
  loop: true,
  defaultBpm: 124,
  intensity: 0.88,
  loose: 0.5,
  reducedMotion: { sequence: 'goofyTwoStep', intensity: 0.26, disableAccents: true },
  poses: { idle: idlePose, twistLeft: twistLeftPose, twistRight: twistRightPose },
  triggerAccents: {
    beat: ['hipBounce'],
    bassHit: ['kneeDip'],
    midsHit: ['shoulderPop'],
    highsHit: ['headNod'],
    chaosHit: ['chaosStretch'],
  },
  steps: [
    { pose: 'twistLeft', durationMs: 240, holdMs: 60, ease: 'easeOutBack', beatSnap: true },
    { pose: 'twistRight', durationMs: 240, holdMs: 60, ease: 'easeOutBack', beatSnap: true },
    { pose: 'twistLeft', durationMs: 240, holdMs: 60, ease: 'easeOutBack' },
    { pose: 'idle', durationMs: 160, holdMs: 40, ease: 'easeInOut' },
  ],
}

