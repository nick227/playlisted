import { idlePose, leftStepPose, rightStepPose } from '../poses/basicPoses'
import { poseVariant } from '../poses/poseAuthoring'
import type { DanceMap } from './sequenceTypes'

const slideLeftPose = poseVariant(leftStepPose, 'slideLeft', 'Slide Left', {
  offset: { x: -18, y: -2 },
  rotations: { hips: -10, chest: 8, leftAnkle: -18, rightAnkle: -22, head: 10 },
})

const slideRightPose = poseVariant(rightStepPose, 'slideRight', 'Slide Right', {
  offset: { x: 18, y: -2 },
  rotations: { hips: 10, chest: -8, leftAnkle: 22, rightAnkle: 18, head: -10 },
})

export const moonwalkSequence: DanceMap = {
  schemaVersion: 1,
  id: 'moonwalk',
  label: 'Moonwalk',
  description: 'Smooth backward-slide illusion with small ankle rolls.',
  loop: true,
  defaultBpm: 100,
  intensity: 0.78,
  loose: 0.58,
  reducedMotion: { sequence: 'goofyTwoStep', intensity: 0.25, disableAccents: true },
  poses: { idle: idlePose, slideLeft: slideLeftPose, slideRight: slideRightPose },
  triggerAccents: {
    beat: ['headNod'],
    bassHit: ['hipBounce'],
    midsHit: ['shoulderPop'],
    highsHit: ['wristFlick'],
    chaosHit: ['chaosStretch'],
  },
  steps: [
    { pose: 'slideLeft', durationMs: 460, holdMs: 30, ease: 'easeInOut', beatSnap: true },
    { pose: 'idle', durationMs: 120, holdMs: 20, ease: 'easeInOut' },
    { pose: 'slideRight', durationMs: 460, holdMs: 30, ease: 'easeInOut', beatSnap: true },
    { pose: 'idle', durationMs: 120, holdMs: 20, ease: 'easeInOut' },
  ],
}

