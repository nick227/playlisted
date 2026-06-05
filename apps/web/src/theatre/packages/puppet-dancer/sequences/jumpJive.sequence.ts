import { bouncePose, idlePose, leftStepPose, rightStepPose } from '../poses/basicPoses'
import { poseVariant } from '../poses/poseAuthoring'
import type { DanceMap } from './sequenceTypes'

const jumpPose = poseVariant(bouncePose, 'jump', 'Jump', {
  offset: { y: -30 },
  scale: 1.04,
  rotations: { leftKnee: -42, rightKnee: 42, leftAnkle: 22, rightAnkle: -22, leftShoulder: 28, rightShoulder: -28, head: -10 },
  face: { mouth: 0.28, brows: 0.24 },
})

export const jumpJiveSequence: DanceMap = {
  schemaVersion: 1,
  id: 'jump-jive',
  label: 'Jump Jive',
  description: 'Springy jump accents between side steps.',
  loop: true,
  defaultBpm: 140,
  intensity: 1,
  loose: 0.8,
  reducedMotion: { sequence: 'goofyTwoStep', intensity: 0.22, disableAccents: true },
  poses: { idle: idlePose, leftStep: leftStepPose, rightStep: rightStepPose, jump: jumpPose },
  triggerAccents: {
    beat: ['hipBounce'],
    bassHit: ['kneeDip'],
    midsHit: ['shoulderPop'],
    highsHit: ['wristFlick'],
    chaosHit: ['chaosStretch'],
  },
  steps: [
    { pose: 'jump', durationMs: 220, holdMs: 30, ease: 'easeOutBack', advanceOn: 'bassHit', accents: ['kneeDip'] },
    { pose: 'leftStep', durationMs: 220, holdMs: 40, ease: 'easeInOut' },
    { pose: 'jump', durationMs: 220, holdMs: 30, ease: 'easeOutBack', advanceOn: 'beat', beatSnap: true },
    { pose: 'rightStep', durationMs: 220, holdMs: 40, ease: 'easeInOut' },
  ],
}

