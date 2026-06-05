import { bouncePose, idlePose, leftStepPose, rightStepPose } from '../poses/basicPoses'
import type { DanceMap } from './sequenceTypes'

export const bounceSequence: DanceMap = {
  schemaVersion: 1,
  id: 'bounce',
  label: 'Bounce',
  description: 'Bass-heavy crouch and rebound map.',
  loop: true,
  defaultBpm: 118,
  intensity: 1,
  loose: 0.74,
  reducedMotion: { sequence: 'goofyTwoStep', intensity: 0.3, disableAccents: true },
  poses: {
    idle: idlePose,
    bounce: bouncePose,
    leftStep: leftStepPose,
    rightStep: rightStepPose,
  },
  triggerAccents: {
    beat: ['hipBounce', 'headNod'],
    bassHit: ['hipBounce', 'kneeDip'],
    midsHit: ['shoulderPop'],
    highsHit: ['wristFlick'],
    chaosHit: ['chaosStretch'],
  },
  steps: [
    { pose: 'bounce', durationMs: 220, holdMs: 50, ease: 'easeInOut', advanceOn: 'bassHit', accents: ['kneeDip'] },
    { pose: 'leftStep', durationMs: 240, holdMs: 40, ease: 'easeInOut' },
    { pose: 'bounce', durationMs: 220, holdMs: 50, ease: 'easeInOut', advanceOn: 'bassHit', accents: ['kneeDip'] },
    { pose: 'rightStep', durationMs: 240, holdMs: 40, ease: 'easeInOut' },
    { pose: 'idle', durationMs: 180, holdMs: 40, ease: 'easeInOut' },
  ],
}
