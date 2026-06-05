import { idlePose, robotPose } from '../poses/basicPoses'
import { poseVariant } from '../poses/poseAuthoring'
import type { DanceMap } from './sequenceTypes'

const robotRightPose = poseVariant(robotPose, 'robotRight', 'Robot Right', { rotations: { chest: -28, head: -28 } })

export const robotSequence: DanceMap = {
  schemaVersion: 1,
  id: 'robot',
  label: 'Robot',
  description: 'Low-loose rigid motion map for stiff robot movement.',
  loop: true,
  defaultBpm: 96,
  intensity: 0.78,
  loose: 0.22,
  reducedMotion: { intensity: 0.25, disableAccents: true },
  poses: {
    idle: idlePose,
    robot: robotPose,
    robotRight: robotRightPose,
  },
  triggerAccents: {
    bassHit: ['hipBounce', 'kneeDip'],
    midsHit: ['shoulderPop'],
    highsHit: ['wristFlick', 'headNod'],
    chaosHit: ['chaosStretch'],
  },
  steps: [
    { pose: 'robot', durationMs: 300, holdMs: 120, ease: 'snap', advanceOn: 'midsHit', accents: ['shoulderPop'] },
    { pose: 'idle', durationMs: 160, holdMs: 80, ease: 'snap' },
    { pose: 'robotRight', durationMs: 300, holdMs: 120, ease: 'snap', advanceOn: 'highsHit', accents: ['wristFlick'] },
    { pose: 'idle', durationMs: 160, holdMs: 80, ease: 'snap' },
  ],
}
