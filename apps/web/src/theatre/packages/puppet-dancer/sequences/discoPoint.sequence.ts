import { idlePose, leftStepPose, rightStepPose } from '../poses/basicPoses'
import { poseVariant } from '../poses/poseAuthoring'
import type { DanceMap } from './sequenceTypes'

const pointUpPose = poseVariant(rightStepPose, 'pointUp', 'Point Up', {
  rotations: { rightShoulder: -10, rightElbow: -95, rightWrist: -88, leftShoulder: 190, leftElbow: 100, chest: -14, head: -16 },
  face: { mouth: 0.28, brows: 0.2 },
})

const pointDownPose = poseVariant(leftStepPose, 'pointDown', 'Point Down', {
  rotations: { rightShoulder: 34, rightElbow: 18, rightWrist: 32, leftShoulder: 190, leftElbow: 105, chest: 18, head: 14 },
  face: { mouth: 0.22, brows: 0.18 },
})

export const discoPointSequence: DanceMap = {
  schemaVersion: 1,
  id: 'disco-point',
  label: 'Disco Point',
  description: 'Classic diagonal point up/down motion.',
  loop: true,
  defaultBpm: 122,
  intensity: 0.92,
  loose: 0.5,
  reducedMotion: { sequence: 'goofyTwoStep', intensity: 0.3, disableAccents: true },
  poses: { idle: idlePose, pointUp: pointUpPose, pointDown: pointDownPose },
  triggerAccents: {
    beat: ['hipBounce'],
    bassHit: ['kneeDip'],
    midsHit: ['shoulderPop'],
    highsHit: ['wristFlick', 'headNod'],
    chaosHit: ['chaosStretch'],
  },
  steps: [
    { pose: 'pointUp', durationMs: 280, holdMs: 80, ease: 'easeOutBack', advanceOn: 'highsHit', accents: ['wristFlick'] },
    { pose: 'idle', durationMs: 130, holdMs: 20, ease: 'easeInOut' },
    { pose: 'pointDown', durationMs: 280, holdMs: 80, ease: 'easeOutBack', advanceOn: 'beat', beatSnap: true },
    { pose: 'idle', durationMs: 130, holdMs: 20, ease: 'easeInOut' },
  ],
}

