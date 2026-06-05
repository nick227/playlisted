import { idlePose, panicLowPose, rightStepPose } from '../poses/basicPoses'
import type { DanceMap } from './sequenceTypes'

export const panicKneesSequence: DanceMap = {
  schemaVersion: 1,
  id: 'panic-knees',
  label: 'Knees Too Low',
  description: 'A frantic crouched panic dance with too much knee bend.',
  loop: true,
  defaultBpm: 132,
  intensity: 1,
  loose: 0.88,
  reducedMotion: { sequence: 'goofyTwoStep', intensity: 0.25, disableAccents: true },
  poses: {
    idle: idlePose,
    panicLow: panicLowPose,
    rightStep: rightStepPose,
  },
  triggerAccents: {
    beat: ['hipBounce', 'kneeDip'],
    bassHit: ['kneeDip'],
    midsHit: ['shoulderPop'],
    highsHit: ['wristFlick', 'headNod'],
    chaosHit: ['chaosStretch', 'kneeDip'],
  },
  steps: [
    { pose: 'panicLow', durationMs: 240, holdMs: 70, ease: 'easeOutBack', advanceOn: 'bassHit', accents: ['kneeDip'] },
    { pose: 'rightStep', durationMs: 200, holdMs: 30, ease: 'easeInOut' },
    { pose: 'panicLow', durationMs: 240, holdMs: 70, ease: 'easeOutBack', advanceOn: 'beat', beatSnap: true },
    { pose: 'idle', durationMs: 180, holdMs: 30, ease: 'easeInOut' },
  ],
}
