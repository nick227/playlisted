import { idlePose, noodleLeftPose, noodleRightPose } from '../poses/basicPoses'
import type { DanceMap } from './sequenceTypes'

export const noodleArmsSequence: DanceMap = {
  schemaVersion: 1,
  id: 'noodle-arms',
  label: 'Noodle Arms',
  description: 'Loose elastic arm noodle choreography.',
  loop: true,
  defaultBpm: 112,
  intensity: 1,
  loose: 1,
  reducedMotion: { sequence: 'goofyTwoStep', intensity: 0.3, disableAccents: true },
  poses: {
    idle: idlePose,
    noodleLeft: noodleLeftPose,
    noodleRight: noodleRightPose,
  },
  triggerAccents: {
    beat: ['hipBounce', 'headNod'],
    bassHit: ['kneeDip'],
    midsHit: ['shoulderPop'],
    highsHit: ['wristFlick'],
    chaosHit: ['chaosStretch'],
  },
  steps: [
    { pose: 'noodleLeft', durationMs: 420, holdMs: 40, ease: 'elasticOut', advanceOn: 'beat', beatSnap: true },
    { pose: 'idle', durationMs: 180, holdMs: 20, ease: 'easeOutBack' },
    { pose: 'noodleRight', durationMs: 420, holdMs: 40, ease: 'elasticOut', advanceOn: 'beat', beatSnap: true },
    { pose: 'idle', durationMs: 180, holdMs: 20, ease: 'easeOutBack' },
  ],
}
