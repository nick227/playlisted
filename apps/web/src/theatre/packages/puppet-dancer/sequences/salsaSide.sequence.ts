import { idlePose, leftStepPose, rightStepPose } from '../poses/basicPoses'
import { poseVariant } from '../poses/poseAuthoring'
import type { DanceMap } from './sequenceTypes'

const salsaLeftPose = poseVariant(leftStepPose, 'salsaLeft', 'Salsa Left', {
  rotations: { hips: -18, chest: 18, leftShoulder: 206, rightShoulder: 10, leftElbow: 126, rightElbow: -42, head: 8 },
  face: { mouth: 0.18 },
})

const salsaRightPose = poseVariant(rightStepPose, 'salsaRight', 'Salsa Right', {
  rotations: { hips: 18, chest: -18, leftShoulder: 170, rightShoulder: -34, leftElbow: 104, rightElbow: -82, head: -8 },
  face: { mouth: 0.18 },
})

export const salsaSideSequence: DanceMap = {
  schemaVersion: 1,
  id: 'salsa-side',
  label: 'Salsa Side',
  description: 'Hip-led side steps with counter-rotating shoulders.',
  loop: true,
  defaultBpm: 112,
  intensity: 0.84,
  loose: 0.76,
  reducedMotion: { sequence: 'goofyTwoStep', intensity: 0.28, disableAccents: true },
  poses: { idle: idlePose, salsaLeft: salsaLeftPose, salsaRight: salsaRightPose },
  triggerAccents: {
    beat: ['hipBounce', 'headNod'],
    bassHit: ['hipBounce'],
    midsHit: ['shoulderPop'],
    highsHit: ['wristFlick'],
    chaosHit: ['chaosStretch'],
  },
  steps: [
    { pose: 'salsaLeft', durationMs: 310, holdMs: 70, ease: 'easeInOut', beatSnap: true },
    { pose: 'idle', durationMs: 120, holdMs: 20, ease: 'easeInOut' },
    { pose: 'salsaRight', durationMs: 310, holdMs: 70, ease: 'easeInOut', beatSnap: true },
    { pose: 'idle', durationMs: 120, holdMs: 20, ease: 'easeInOut' },
  ],
}

