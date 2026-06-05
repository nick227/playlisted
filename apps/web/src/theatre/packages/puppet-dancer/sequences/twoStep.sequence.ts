import { idlePose, leftStepPose, rightStepPose } from '../poses/basicPoses'
import type { DanceMap } from './sequenceTypes'

export const twoStepSequence: DanceMap = {
  schemaVersion: 1,
  id: 'two-step',
  label: 'Two Step',
  description: 'Loose, goofy side-to-side beginner dance.',
  loop: true,
  defaultBpm: 104,
  intensity: 0.86,
  loose: 0.82,
  reducedMotion: { intensity: 0.35, disableAccents: true },
  poses: {
    idle: idlePose,
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
    { pose: 'idle', durationMs: 240, holdMs: 60, ease: 'easeInOut' },
    { pose: 'leftStep', durationMs: 340, holdMs: 80, ease: 'easeInOut', advanceOn: 'beat', beatSnap: true },
    { pose: 'idle', durationMs: 180, holdMs: 40, ease: 'easeInOut' },
    { pose: 'rightStep', durationMs: 340, holdMs: 80, ease: 'easeInOut', advanceOn: 'beat', beatSnap: true },
  ],
}
