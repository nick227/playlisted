import { idlePose, leftStepPose, rightStepPose } from '../poses/basicPoses'
import { poseVariant } from '../poses/poseAuthoring'
import type { DanceMap } from './sequenceTypes'

const crabLeftPose = poseVariant(leftStepPose, 'crabLeft', 'Crab Left', {
  offset: { x: -20, y: 18 },
  scale: 0.95,
  rotations: { hips: -18, chest: 12, leftKnee: 34, rightKnee: -28, leftShoulder: 246, rightShoulder: -66, leftWrist: -38, rightWrist: 38 },
  face: { mouth: 0.25, brows: 0.3 },
})

const crabRightPose = poseVariant(rightStepPose, 'crabRight', 'Crab Right', {
  offset: { x: 20, y: 18 },
  scale: 0.95,
  rotations: { hips: 18, chest: -12, leftKnee: 28, rightKnee: -34, leftShoulder: 156, rightShoulder: 46, leftWrist: -38, rightWrist: 38 },
  face: { mouth: 0.25, brows: 0.3 },
})

export const crabShuffleSequence: DanceMap = {
  schemaVersion: 1,
  id: 'crab-shuffle',
  label: 'Crab Shuffle',
  description: 'Sideways low shuffle with bent knees and claw hands.',
  loop: true,
  defaultBpm: 116,
  intensity: 0.95,
  loose: 0.72,
  reducedMotion: { sequence: 'goofyTwoStep', intensity: 0.22, disableAccents: true },
  poses: { idle: idlePose, crabLeft: crabLeftPose, crabRight: crabRightPose },
  triggerAccents: {
    beat: ['hipBounce'],
    bassHit: ['kneeDip'],
    midsHit: ['shoulderPop'],
    highsHit: ['wristFlick'],
    chaosHit: ['chaosStretch'],
  },
  steps: [
    { pose: 'crabLeft', durationMs: 300, holdMs: 70, ease: 'easeOutBack', advanceOn: 'bassHit', accents: ['kneeDip'] },
    { pose: 'idle', durationMs: 110, holdMs: 20, ease: 'easeInOut' },
    { pose: 'crabRight', durationMs: 300, holdMs: 70, ease: 'easeOutBack', advanceOn: 'bassHit', accents: ['kneeDip'] },
    { pose: 'idle', durationMs: 110, holdMs: 20, ease: 'easeInOut' },
  ],
}

