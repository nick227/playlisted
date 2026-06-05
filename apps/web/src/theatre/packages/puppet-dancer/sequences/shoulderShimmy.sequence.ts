import { idlePose, shimmyLeftPose, shimmyRightPose } from '../poses/basicPoses'
import type { DanceMap } from './sequenceTypes'

export const shoulderShimmySequence: DanceMap = {
  schemaVersion: 1,
  id: 'shoulder-shimmy',
  label: 'Shoulder Shimmy',
  description: 'Fast shoulder-driven shimmy.',
  loop: true,
  defaultBpm: 126,
  intensity: 0.9,
  loose: 0.62,
  reducedMotion: { sequence: 'goofyTwoStep', intensity: 0.28, disableAccents: true },
  poses: {
    idle: idlePose,
    shimmyLeft: shimmyLeftPose,
    shimmyRight: shimmyRightPose,
  },
  triggerAccents: {
    beat: ['hipBounce'],
    bassHit: ['kneeDip'],
    midsHit: ['shoulderPop'],
    highsHit: ['wristFlick', 'headNod'],
    chaosHit: ['chaosStretch', 'shoulderPop'],
  },
  steps: [
    { pose: 'shimmyLeft', durationMs: 150, holdMs: 20, ease: 'easeOutBack', advanceOn: 'midsHit', accents: ['shoulderPop'] },
    { pose: 'shimmyRight', durationMs: 150, holdMs: 20, ease: 'easeOutBack', advanceOn: 'midsHit', accents: ['shoulderPop'] },
    { pose: 'shimmyLeft', durationMs: 150, holdMs: 20, ease: 'easeOutBack' },
    { pose: 'idle', durationMs: 180, holdMs: 40, ease: 'easeInOut' },
  ],
}
