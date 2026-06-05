import { idlePose, leftStepPose, rightStepPose } from '../poses/basicPoses'
import { poseVariant } from '../poses/poseAuthoring'
import type { DanceMap } from './sequenceTypes'

const marchLeftPose = poseVariant(leftStepPose, 'marchLeft', 'March Left', {
  offset: { x: 5, y: -10 },
  rotations: { leftKnee: -34, rightKnee: -16, leftAnkle: 18, rightAnkle: -10, leftElbow: 26, rightElbow: -26 },
  face: { brows: 0.2 },
})

const marchRightPose = poseVariant(rightStepPose, 'marchRight', 'March Right', {
  offset: { x: -5, y: -10 },
  rotations: { leftKnee: 16, rightKnee: 34, leftAnkle: 10, rightAnkle: -18, leftElbow: 26, rightElbow: -26 },
  face: { brows: 0.2 },
})

export const tinyMarchSequence: DanceMap = {
  schemaVersion: 1,
  id: 'tiny-march',
  label: 'Tiny March',
  description: 'Small crisp marching steps.',
  loop: true,
  defaultBpm: 128,
  intensity: 0.7,
  loose: 0.34,
  reducedMotion: { sequence: 'goofyTwoStep', intensity: 0.22, disableAccents: true },
  poses: { idle: idlePose, marchLeft: marchLeftPose, marchRight: marchRightPose },
  triggerAccents: {
    beat: ['headNod'],
    bassHit: ['kneeDip'],
    midsHit: ['shoulderPop'],
    highsHit: ['wristFlick'],
    chaosHit: ['chaosStretch'],
  },
  steps: [
    { pose: 'marchLeft', durationMs: 180, holdMs: 50, ease: 'snap', advanceOn: 'beat', beatSnap: true },
    { pose: 'idle', durationMs: 100, holdMs: 20, ease: 'snap' },
    { pose: 'marchRight', durationMs: 180, holdMs: 50, ease: 'snap', advanceOn: 'beat', beatSnap: true },
    { pose: 'idle', durationMs: 100, holdMs: 20, ease: 'snap' },
  ],
}

