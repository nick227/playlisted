import { idlePose, leftStepPose, rightStepPose } from '../poses/basicPoses'
import { poseVariant } from '../poses/poseAuthoring'
import type { DanceMap } from './sequenceTypes'

const chickenLeftPose = poseVariant(leftStepPose, 'chickenLeft', 'Chicken Left', {
  rotations: {
    chest: 22,
    head: -24,
    leftElbow: -58,
    rightElbow: 58,
    leftWrist: 44,
    rightWrist: -44,
  },
  face: { mouth: 0.28, brows: 0.2 },
})

const chickenRightPose = poseVariant(rightStepPose, 'chickenRight', 'Chicken Right', {
  rotations: {
    chest: -22,
    head: 24,
    leftElbow: -58,
    rightElbow: 58,
    leftWrist: 44,
    rightWrist: -44,
  },
  face: { mouth: 0.28, brows: 0.2 },
})

export const chickenWalkSequence: DanceMap = {
  schemaVersion: 1,
  id: 'chicken-walk',
  label: 'Chicken Walk',
  description: 'Vetting dance: proves a new dance can be authored as maps only.',
  loop: true,
  defaultBpm: 116,
  intensity: 0.82,
  loose: 0.7,
  reducedMotion: { sequence: 'goofyTwoStep', intensity: 0.28, disableAccents: true },
  poses: {
    idle: idlePose,
    chickenLeft: chickenLeftPose,
    chickenRight: chickenRightPose,
  },
  triggerAccents: {
    beat: ['hipBounce', 'headNod'],
    bassHit: ['kneeDip'],
    midsHit: ['shoulderPop'],
    highsHit: ['wristFlick'],
    chaosHit: ['chaosStretch'],
  },
  steps: [
    { pose: 'chickenLeft', durationMs: 260, holdMs: 40, ease: 'easeOutBack', advanceOn: 'beat', beatSnap: true },
    { pose: 'idle', durationMs: 110, holdMs: 30, ease: 'easeInOut' },
    { pose: 'chickenRight', durationMs: 260, holdMs: 40, ease: 'easeOutBack', advanceOn: 'beat', beatSnap: true },
    { pose: 'idle', durationMs: 110, holdMs: 30, ease: 'easeInOut' },
  ],
}

